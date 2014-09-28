var perselyek = [];
var budgets = [];
var txs = [];

QUnit.module("module", {
    setup: function (assert) {
        perselyek = [];
        budgets = [];
        txs = [];
    }, teardown: function (assert) {
        //assert.ok( true, "and one extra assert after each test" );
    }
});

function createPersely(name) {
    var newPersely = new Persely();
    newPersely.name(name);
    perselyek.push(newPersely);
    return newPersely;
}

function createBudget(year, month) {
    var b = new Budget();
    b.year(year);
    b.month(month);
    budgets.push(b);
    return b;
}

function createBudgetEntry(budget, category, budgetedValue, planningType) {
    var newBudgetEntry = new BudgetEntry(budgetedValue);
    newBudgetEntry.budgeted_to(category);
    newBudgetEntry.planningType(planningType);
    budget.budgetEntries.push(newBudgetEntry);
    return newBudgetEntry;
}

function createTransaction(src, type, dst, value, year, month) {
    var tx = new Transaction();
    tx.src(src);
    tx.dst(dst);
    tx.type(type);
    tx.year(year);
    tx.month(month);
    tx.day(21);
    tx.value(value);
    txs.push(tx);
}

function recalc() {
    Model = new PiggyModel(perselyek, budgets, txs, "hu");
    Model.recalc();
}

QUnit.test("Az IgnoreInBudgetFlagging átutalások módosítják a persely értékét, de a Budget-ben nem jelennek meg", function (assert) {
    var persely = createPersely("persely");
    var budget = createBudget(2014, 7);
    var budgetEntry = createBudgetEntry(budget, "persely", 100, "PlanningType.Expense");

    recalc();
    assert.equal(persely.sumValue(), 0);
    assert.equal(budgetEntry.balance(), 100);

    createTransaction(null, "TransactionType.IgnoreInBudgetFlagging", "persely", 100, 2014, 7);
    createTransaction(null, "TransactionType.IgnoreInBudgetFlagging", "persely", 100, 2014, 7);
    recalc();
    assert.equal(persely.sumValue(), 2 * 100);
    assert.equal(budgetEntry.balance(), 100);

    createTransaction(null, "TransactionType.IgnoreInBudgetFlagging", "persely", 100, 2014, 7);
    createTransaction(null, "TransactionType.IgnoreInBudgetFlagging", "persely", 100, 2014, 7);
    createTransaction(null, "TransactionType.IgnoreInBudgetFlagging", "persely", 100, 2014, 7);
    recalc();
    assert.equal(persely.sumValue(), (2 * 100) + 3 * 100);
    assert.equal(budgetEntry.balance(), 100);
});


QUnit.test("Tranzakció forrásból!", function (assert) {
    var src = createPersely("forrásPersely");
    var dst = createPersely("célPersely");
    var budgetEntry = createBudgetEntry(createBudget(2014, 7), "célPersely", 100, "PlanningType.Expense");

    recalc();
    assert.equal(src.sumValue(), 0);
    assert.equal(dst.sumValue(), 0);
    assert.equal(budgetEntry.balance(), 100);

    createTransaction("forrásPersely", "TransactionType.IgnoreInBudgetFlagging", "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", "TransactionType.IgnoreInBudgetFlagging", "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", "TransactionType.IgnoreInBudgetFlagging", "célPersely", 100, 2014, 7);
    recalc();
    assert.equal(src.sumValue(), -300);
    assert.equal(dst.sumValue(), 300);
    assert.equal(budgetEntry.balance(), 100);
});


QUnit.test("Flaggelés!", function (assert) {
    var src = createPersely("forrásPersely");
    var dst = createPersely("célPersely");
    var budget = createBudget(2014, 7);
    var budgetEntryForExpense = createBudgetEntry(budget, "célPersely", 100, "PlanningType.Expense");
    var budgetEntryForSave = createBudgetEntry(budget, "célPersely", 100, "PlanningType.Save");

    recalc();
    assert.equal(src.sumValue(), 0);
    assert.equal(dst.sumValue(), 0);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 0);

    createTransaction("forrásPersely", "TransactionType.Flagging", "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", "TransactionType.Flagging", "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", "TransactionType.Flagging", "célPersely", 100, 2014, 7);
    recalc();
    assert.equal(src.sumValue(), -300);
    assert.equal(dst.sumValue(), 300);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 300);
});

QUnit.test("Spending", function (assert) {
    var src = createPersely("forrásPersely");
    var dst = createPersely("célPersely");
    var budget = createBudget(2014, 7);
    var budgetEntryForExpense = createBudgetEntry(budget, "célPersely", 100, "PlanningType.Expense");
    var budgetEntryForSave = createBudgetEntry(budget, "célPersely", 100, "PlanningType.Save");

    recalc();
    assert.equal(src.sumValue(), 0);
    assert.equal(dst.sumValue(), 0);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 0);

    createTransaction("forrásPersely", "TransactionType.Spending", "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", "TransactionType.Spending", "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", "TransactionType.Spending", "célPersely", 100, 2014, 7);
    recalc();
    assert.equal(src.sumValue(), -300);
    assert.equal(dst.sumValue(), 0, "Elköltöttünk erre a kategóriára 300-at, akkor az a pénz elúszott, nem növeli a dst-t.");
    assert.equal(budgetEntryForExpense.balance(), 100 - 300);
    assert.equal(budgetEntryForSave.balance(), 0);
});

QUnit.test("Spending and Flagging", function (assert) {
    var src = createPersely("forrásPersely");
    var dst = createPersely("célPersely");
    var budget = createBudget(2014, 7);
    var budgetEntryForExpense = createBudgetEntry(budget, "célPersely", 100, "PlanningType.Expense");
    var budgetEntryForSave = createBudgetEntry(budget, "célPersely", 100, "PlanningType.Save");

    recalc();
    assert.equal(src.sumValue(), 0);
    assert.equal(dst.sumValue(), 0);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 0);

    createTransaction("forrásPersely", "TransactionType.Spending", "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", "TransactionType.Flagging", "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", "TransactionType.Spending", "célPersely", 100, 2014, 7);
    recalc();
    assert.equal(src.sumValue(), -300);
    assert.equal(dst.sumValue(), 100, "Az egy darab Flaggelés növeli a dst értékét 100-zal, a 200 spending eltűnik");
    assert.equal(budgetEntryForExpense.balance(), -100, "100-at terveztünk be, de 200-at költöttünk");
    assert.equal(budgetEntryForSave.balance(), 100, "0 volt, de Flaggingeltem rá 100-at, így lett 100/100.");
});

QUnit.test("Spending and Flagging in multiple month", function (assert) {
    var src = createPersely("forrásPersely");
    var dst = createPersely("célPersely");
    var budget1 = createBudget(2014, 7);
    var budget2 = createBudget(2014, 8);
    var budget3 = createBudget(2014, 9);
    var budgetEntryForExpense1 = createBudgetEntry(budget1, "célPersely", 100, "PlanningType.Expense");
    var budgetEntryForSave1 = createBudgetEntry(budget1, "célPersely", 100, "PlanningType.Save");
    var budgetEntryForExpense2 = createBudgetEntry(budget2, "célPersely", 200, "PlanningType.Expense");
    var budgetEntryForSave2 = createBudgetEntry(budget2, "célPersely", 200, "PlanningType.Save");
    var budgetEntryForExpense3 = createBudgetEntry(budget3, "célPersely", 300, "PlanningType.Expense");
    var budgetEntryForSave3 = createBudgetEntry(budget3, "célPersely", 300, "PlanningType.Save");

    recalc();
    assert.equal(src.sumValue(), 0);
    assert.equal(dst.sumValue(), 0);
    assert.equal(budgetEntryForExpense1.balance(), 100);
    assert.equal(budgetEntryForSave1.balance(), 0);
    assert.equal(budgetEntryForExpense2.balance(), 200);
    assert.equal(budgetEntryForSave2.balance(), 0);
    assert.equal(budgetEntryForExpense3.balance(), 300);
    assert.equal(budgetEntryForSave3.balance(), 0);

    createTransaction("forrásPersely", "TransactionType.Spending", "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", "TransactionType.Flagging", "célPersely", 150, 2014, 8);
    createTransaction("forrásPersely", "TransactionType.Spending", "célPersely", 200, 2014, 9);
    recalc();
    assert.equal(src.sumValue(), -(100+150+200));
    assert.equal(dst.sumValue(), 150, "150 lett ráFlaggelve, ennyivel növekedett az értéke");
    assert.equal(budgetEntryForExpense1.balance(), 0);
    assert.equal(budgetEntryForSave1.balance(), 0);

    assert.equal(budgetEntryForExpense2.balance(), 200);
    assert.equal(budgetEntryForSave2.balance(), 150);

    assert.equal(budgetEntryForExpense3.balance(), 100, "300 van betervezve, 200 van költve");
    assert.equal(budgetEntryForSave3.balance(), 0);
});
