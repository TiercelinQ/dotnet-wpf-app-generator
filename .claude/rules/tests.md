# Automated tests rules - .NET / WPF

## Activation

Conditional - enabled if Phase 1 tests = `Yes`.

If enabled:
- Test setup mandatory in the architectural contract (Phase 4).
- Dedicated extra batch in Phase 5 (Small: 4 batches · Medium/Large: 5 batches).
- Test packages added (`xunit.v3`, `Microsoft.NET.Test.Sdk`, `NSubstitute`).

If disabled:
- No test project, no extra batch. Batch count unchanged (Small: 3 · Medium/Large: 4).

---

## Non-negotiable stack

- `xunit.v3` (unit + integration).
- `NSubstitute` for the service and dependency doubles.
- Native `Assert.*` - no fluent assertion library. The BCL assertions cover the need and add no licence question.
- No other test framework.

Test project: `tests/App.Wpf.Tests/App.Wpf.Tests.csproj`, referencing the application project. Same `Directory.Build.props`, so the same nullable and warning settings apply to the tests.

`dotnet test` is the single entry point.

---

## What to test, per layer

| Layer         | Target              | What to test                                                                 |
| ------------- | ------------------- | ---------------------------------------------------------------------------- |
| `Models/`     | Pure logic          | validators, `Result<T>` behavior, DTO helpers                                |
| `Helpers/`    | 100% lines          | all branches of the pure functions                                           |
| `Services/`   | Business logic      | public methods, named exceptions mapped to `Result` failures, edge cases (SQLite against an in-memory connection, external processes substituted) |
| `ViewModels/` | Commands + state    | a command updates the expected properties; a failing service produces a `Danger` feedback; `CanExecute` guards hold; cancellation leaves no partial state |
| `Views/`      | not tested          | XAML has no logic to test (`@rules/mvvm.md`). A view that would need a test is a view holding logic that belongs in its ViewModel. |
| `Converters/` | Pure transforms     | `Convert` and, when implemented, `ConvertBack`                               |

> The source framework smoke-tested its views because they were plain functions of state. WPF views are not: rendering one needs an STA thread and a dispatcher pump, which buys almost nothing. The ViewModel tests carry that coverage instead. This is a deliberate substitution, not an omission.

---

## Conventions

- File naming: `[Type]Tests.cs` under `tests/App.Wpf.Tests/`, mirroring the `src/App.Wpf/` folder layout.
- Test names: explicit French behavior - always French, independent of the user's interface language - for example `Rejette_un_payload_sans_email`.
- No `Assert.True(true)`, no empty test, no `[Fact(Skip = ...)]` left behind.
- No real network, no file on disk outside a temp folder the test deletes: substitute the service interfaces, and use an in-memory SQLite connection (`DataSource=:memory:`) for data tests.
- No `Thread.Sleep` - `await` the async API under test, or use a controllable time abstraction.
- Async tests return `Task`, never `async void`.
- One assertion subject per test. Several `Assert` calls on the same subject are fine.

---

## Service test pattern (mandatory)

```csharp
public sealed class RecordServiceTests
{
    [Fact]
    public async Task Retourne_une_erreur_danger_sur_payload_invalide()
    {
        var repository = Substitute.For<IRecordRepository>();
        var service = new RecordService(repository, NullLogger<RecordService>.Instance);

        var result = await service.SaveAsync(new RecordInput(Name: "x", Email: ""), TestContext.Current.CancellationToken);

        Assert.False(result.Ok);
        Assert.Equal(FeedbackType.Warning, result.Error!.Type);
        await repository.DidNotReceive().SaveAsync(Arg.Any<RecordInput>(), Arg.Any<CancellationToken>());
    }
}
```

## ViewModel test pattern (mandatory)

```csharp
public sealed class RecordViewModelTests
{
    [Fact]
    public async Task Affiche_un_feedback_danger_quand_le_service_echoue()
    {
        var records = Substitute.For<IRecordService>();
        records.SaveAsync(Arg.Any<RecordInput>(), Arg.Any<CancellationToken>())
               .Returns(Result<Record>.Failure(new(FeedbackType.Danger, "Echec")));
        var feedback = Substitute.For<IFeedbackService>();
        var viewModel = new RecordViewModel(records, feedback, NullLogger<RecordViewModel>.Instance);

        await viewModel.SaveCommand.ExecuteAsync(null);

        feedback.Received(1).Show(Arg.Is<ResultError>(e => e.Type == FeedbackType.Danger));
    }
}
```

A ViewModel is testable only because it depends on interfaces and never on a `Window`, a `Dispatcher`, or a `MessageBox` (`@rules/mvvm.md`). A ViewModel that cannot be constructed in a test is a design defect, not a testing problem.

---

## Anti-patterns - what NOT to do

- **Do not** write `Assert.True(true)`, an empty test, or a skipped test left behind.
- **Do not** hit the network or a real database file - substitute the interfaces, use in-memory SQLite.
- **Do not** use `Thread.Sleep` to wait for anything.
- **Do not** test a service without substituting its dependencies.
- **Do not** try to render a XAML view in a test - test its ViewModel.
- **Do not** assert on a log message as a substitute for asserting on behavior.
- **Do not** create a test project when Phase 1 tests = No (and `/wpf-run-tests` never scaffolds one unasked).

## Integrity verification

Detailed in `@rules/verification.md`. Key points: each source module has a matching test (Phase 4 mapping); `dotnet test` exits 0; the test project references the application project and the test packages are declared in `Directory.Packages.props`; no skipped or empty test.
