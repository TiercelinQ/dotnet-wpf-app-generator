# Database rules - WPF

## Stack per Phase 1 DB choice

| DB choice | Library                        | Reference                                |
| --------- | ------------------------------ | ---------------------------------------- |
| SQLite    | `Microsoft.Data.Sqlite`        | `Services/Data/DatabaseService.cs`       |
| JSON      | `System.Text.Json` (BCL)       | direct in the services                   |
| CSV       | `System.IO` + a parser val. Phase 1 | direct in the services              |
| none      | -                              | -                                        |

All DB access lives in the **Services layer** (`Services/Data/`) - never in a ViewModel, never in a View. ViewModels reach data only through an injected service interface (`@rules/mvvm.md`).

No EF Core: the schema is small, hand-written, and versioned. Adding EF Core is a Phase 1 decision, not a mid-project one.

---

## Architecture (SQLite) - single access point

```csharp
// Services/Data/DatabaseService.cs
public sealed class DatabaseService : IDatabaseService, IDisposable
{
    private readonly string _connectionString;

    public DatabaseService(IAppPaths paths)
    {
        var file = Path.Combine(paths.UserData, AppConfig.DbFileName);
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = file,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Pooling = true,
        }.ToString();
    }

    /// <summary>Opens a connection with the mandatory pragmas applied.</summary>
    public SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var pragma = connection.CreateCommand();
        pragma.CommandText = "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;";
        pragma.ExecuteNonQuery();
        return connection;
    }
}
```

### Usage in the business services

```csharp
// Services/RecordService.cs
public async Task<long> SaveAsync(RecordInput input, CancellationToken ct)
{
    await using var connection = _db.OpenConnection();
    await using var command = connection.CreateCommand();
    command.CommandText = "INSERT INTO records (name, email) VALUES ($name, $email) RETURNING id";
    command.Parameters.AddWithValue("$name", input.Name);
    command.Parameters.AddWithValue("$email", input.Email);
    return (long)(await command.ExecuteScalarAsync(ct))!;
}
```

Every data method takes a `CancellationToken` and is awaited off the UI thread (`@rules/threading.md`).

---

## Versioned migrations

### Principle

- The schema is versioned via `PRAGMA user_version`.
- `AppConfig.DbSchemaVersion` is the target version expected by the code.
- At startup (**before** the main window is shown), `RunMigrations()` applies the missing migrations sequentially. **Up only** - no automatic rollback.

```csharp
// Services/Data/MigrationRunner.cs
internal static class MigrationRunner
{
    private static readonly Dictionary<int, string[]> Migrations = new()
    {
        [1] =
        [
            """
            CREATE TABLE IF NOT EXISTS records (
              id    INTEGER PRIMARY KEY AUTOINCREMENT,
              name  TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL
            )
            """,
        ],
        // [2] = ["ALTER TABLE records ADD COLUMN phone TEXT"],
    };

    public static void Run(IDatabaseService db)
    {
        using var connection = db.OpenConnection();
        var current = ReadUserVersion(connection);
        if (current > AppConfig.DbSchemaVersion)
        {
            throw new DatabaseException(
                $"DB version {current} ahead of code {AppConfig.DbSchemaVersion}. Update the app.");
        }

        using var transaction = connection.BeginTransaction();
        foreach (var version in Migrations.Keys.Order().Where(v => v > current))
        {
            foreach (var statement in Migrations[version])
            {
                Execute(connection, transaction, statement);
            }
            Execute(connection, transaction, $"PRAGMA user_version = {version}");
        }
        transaction.Commit();
    }
}
```

`PRAGMA user_version` does not accept a parameter, so the version is interpolated. It is an `int` key of a compile-time dictionary, never user input - the only interpolated SQL the rules allow, and it carries this comment in the delivered code.

### Call from the composition root

```csharp
// App.xaml.cs - after the host is built, before the main window is shown
MigrationRunner.Run(host.Services.GetRequiredService<IDatabaseService>());
```

---

## JSON / CSV mode (no DBMS)

- Storage under `%APPDATA%\<AppName>` - never in the install folder (`@rules/security.md`).
- A service encapsulates its file path; writes go through a temp file plus `File.Move` with overwrite, so a crash never leaves a half-written file.
- No versioned migrations in JSON/CSV - explicit conversion on load if the shape changes.
- `System.Text.Json` with a source-generated context (`JsonSerializerContext`) so serialization stays trim-friendly and fast.

---

## Seed data (if DB != none)

Delivered **inside the last code batch** of generation (the batch already carrying the root configs - no dedicated seed batch, the announced batch total stays the calibration count) as a standalone entry point (`tools/Seed/` project or a `--seed` switch on the app, decided in Phase 4):
- Single responsibility: populate the DB with a coherent demo dataset through the services (`Services/`), never raw SQL outside the data services.
- Idempotent: check the target tables are empty before inserting; re-running must not duplicate rows.
- FK integrity: insert parents before children, reuse the returned ids.
- Volume: ~5-15 rows per entity, realistic values in the user's language.
- Never run automatically at startup; run manually.

---

## Anti-patterns - what NOT to do

- **Do not** access the DB from a ViewModel or a View - services only.
- **Do not** create a `SqliteConnection` outside `DatabaseService`.
- **Do not** build a query by string concatenation or interpolation - always parameters (`@rules/security.md`). The `user_version` pragma is the single documented exception.
- **Do not** `SELECT *` without justification (list the columns).
- **Do not** write an automatic `down` migration.
- **Do not** run a query synchronously on the UI thread (`@rules/threading.md`).
- **Do not** leave a connection or a reader undisposed - `await using` on every one.

## Integrity verification

Detailed in `@rules/verification.md`. Key points (if DB != none): `DatabaseService` single access point present; `MigrationRunner` present and called from the composition root before the main window; `AppConfig.DbSchemaVersion` consistent with `max(Migrations)`; no DB access outside `Services/Data/`; SQL 100% parameterized (the `user_version` pragma excepted, commented); every command and connection disposed; every data method cancellable.
