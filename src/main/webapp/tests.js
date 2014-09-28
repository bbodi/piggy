/// <reference path="qunit.d.ts" />
/// <reference path="budget.ts" />
var places = [];
var perselyek = [];
var budgets = [];
var txs = [];

QUnit.module("module", {
    setup: function () {
        places = [];
        perselyek = [];
        budgets = [];
        txs = [];
    }, teardown: function () {
        //assert.ok( true, "and one extra assert after each test" );
    }
});

function createPlace(name) {
    var place = new Place(0, name);
    places.push(place);
    return place;
}

function createPersely(name, place) {
    var newPersely = new Persely(0, place, name, 0, null);
    if (place != null) {
        place.perselyek.push(newPersely);
    }
    perselyek.push(newPersely);
    return newPersely;
}

function createBudget(year, month) {
    var b = new Budget(year, month);
    budgets.push(b);
    return b;
}

function createBudgetEntry(budget, budgeted_to, budgetedValue, planningType) {
    var newBudgetEntry = new BudgetEntry(0, budgeted_to, budgetedValue, planningType);
    budget.budgetEntries.push(newBudgetEntry);
    return newBudgetEntry;
}

function createTransaction(src, type, dst, value, year, month) {
    var tx = new Transaction();
    tx.src(src);
    tx.dst(dst);
    tx.tx_type(type);
    tx.year(year);
    tx.month(month);
    tx.day(21);
    tx.value(value);
    txs.push(tx);
}

function recalc() {
    Model = new PiggyModel("hu");
    Model.fill(places, perselyek, budgets, txs);
    Model.recalc();
    txs.forEach(function (tx) {
        if (tx.alert_msg() != null) {
            alert(tx.alert_msg());
        }
    });
}

QUnit.test("Az IgnoreInBudgetFlagging átutalások módosítják a persely értékét, de a Budget-ben nem jelennek meg", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("persely", place);
    var budget = createBudget(2014, 7);
    var budgetEntry = createBudgetEntry(budget, "persely", 100, 0 /* Expense */);

    recalc();
    assert.equal(persely.currentValue(), 0);
    assert.equal(budgetEntry.balance(), 100);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "persely", 100, 2014, 7);
    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "persely", 100, 2014, 7);
    recalc();
    assert.equal(persely.currentValue(), 2 * 100);
    assert.equal(budgetEntry.balance(), 100);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "persely", 100, 2014, 7);
    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "persely", 100, 2014, 7);
    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "persely", 100, 2014, 7);
    recalc();
    assert.equal(persely.currentValue(), (2 * 100) + 3 * 100);
    assert.equal(budgetEntry.balance(), 100);
});

QUnit.test("Tranzakció forrásból!", function (assert) {
    var place = createPlace("kp");
    var src = createPersely("forrásPersely", place);
    var dst = createPersely("célPersely", place);
    var budgetEntry = createBudgetEntry(createBudget(2014, 7), "célPersely", 100, 0 /* Expense */);

    recalc();
    assert.equal(src.currentValue(), 0);
    assert.equal(dst.currentValue(), 0);
    assert.equal(budgetEntry.balance(), 100);

    createTransaction("forrásPersely", 2 /* IgnoreInBudgetFlagging */, "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", 2 /* IgnoreInBudgetFlagging */, "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", 2 /* IgnoreInBudgetFlagging */, "célPersely", 100, 2014, 7);
    recalc();
    assert.equal(src.currentValue(), -300);
    assert.equal(dst.currentValue(), 300);
    assert.equal(budgetEntry.balance(), 100);
});

QUnit.test("Flaggelés!", function (assert) {
    var place = createPlace("kp");
    var src = createPersely("forrásPersely", place);
    var dst = createPersely("célPersely", place);
    var budget = createBudget(2014, 7);
    var budgetEntryForExpense = createBudgetEntry(budget, "célPersely", 100, 0 /* Expense */);
    var budgetEntryForSave = createBudgetEntry(budget, "célPersely", 100, 1 /* Save */);

    recalc();
    assert.equal(src.currentValue(), 0);
    assert.equal(dst.currentValue(), 0);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 0);

    createTransaction("forrásPersely", 1 /* Flagging */, "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", 1 /* Flagging */, "célPersely", 100, 2014, 7);
    createTransaction("forrásPersely", 1 /* Flagging */, "célPersely", 100, 2014, 7);
    recalc();
    assert.equal(src.currentValue(), -300);
    assert.equal(dst.currentValue(), 300);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 300);
});

QUnit.test("Spending", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("forrásPersely", place);
    var budget = createBudget(2014, 7);
    var budgetEntryForExpense = createBudgetEntry(budget, "forrásPersely", 100, 0 /* Expense */);
    var budgetEntryForSave = createBudgetEntry(budget, "forrásPersely", 100, 1 /* Save */);

    recalc();
    assert.equal(persely.currentValue(), 0);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 0);

    createTransaction("kp", 0 /* Spending */, "forrásPersely", 100, 2014, 7);
    createTransaction("kp", 0 /* Spending */, "forrásPersely", 100, 2014, 7);
    createTransaction("kp", 0 /* Spending */, "forrásPersely", 100, 2014, 7);
    recalc();
    assert.equal(persely.currentValue(), 0);
    assert.equal(budgetEntryForExpense.balance(), 100 - 300);
    assert.equal(budgetEntryForSave.balance(), 0);
    assert.equal(place.myValue(), -300);
    assert.equal(place.sumValue(), -300);
});

QUnit.test("Spending and Flagging", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("forrásPersely", place);
    var budget = createBudget(2014, 7);
    var budgetEntryForExpense = createBudgetEntry(budget, "forrásPersely", 100, 0 /* Expense */);
    var budgetEntryForSave = createBudgetEntry(budget, "forrásPersely", 100, 1 /* Save */);

    recalc();
    assert.equal(persely.currentValue(), 0);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 0);

    createTransaction("kp", 0 /* Spending */, "forrásPersely", 100, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "forrásPersely", 100, 2014, 7);
    createTransaction("kp", 0 /* Spending */, "forrásPersely", 100, 2014, 7);
    recalc();
    assert.equal(persely.currentValue(), 100);
    assert.equal(budgetEntryForExpense.balance(), -100, "100-at terveztünk be, de 200-at költöttünk");
    assert.equal(budgetEntryForSave.balance(), 100, "0 volt, de Flaggingeltem rá 100-at, így lett 100/100.");
    assert.equal(place.myValue(), -300);
    assert.equal(place.sumValue(), -200);
});

QUnit.test("Spending and Flagging in multiple month", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("forrásPersely", place);
    var budget1 = createBudget(2014, 7);
    var budgetEntryForExpense1 = createBudgetEntry(budget1, "forrásPersely", 100, 0 /* Expense */);
    var budgetEntryForSave1 = createBudgetEntry(budget1, "forrásPersely", 100, 1 /* Save */);
    var budget2 = createBudget(2014, 8);
    var budgetEntryForExpense2 = createBudgetEntry(budget2, "forrásPersely", 200, 0 /* Expense */);
    var budgetEntryForSave2 = createBudgetEntry(budget2, "forrásPersely", 200, 1 /* Save */);
    var budget3 = createBudget(2014, 9);
    var budgetEntryForExpense3 = createBudgetEntry(budget3, "forrásPersely", 300, 0 /* Expense */);
    var budgetEntryForSave3 = createBudgetEntry(budget3, "forrásPersely", 300, 1 /* Save */);

    recalc();
    assert.equal(persely.currentValue(), 0);
    assert.equal(budgetEntryForExpense1.balance(), 100);
    assert.equal(budgetEntryForSave1.balance(), 0);
    assert.equal(budgetEntryForExpense2.balance(), 100 + 200);
    assert.equal(budgetEntryForSave2.balance(), 0);
    assert.equal(budgetEntryForExpense3.balance(), 100 + 200 + 300);
    assert.equal(budgetEntryForSave3.balance(), 0);

    createTransaction("kp", 0 /* Spending */, "forrásPersely", 100, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "forrásPersely", 150, 2014, 8);
    createTransaction("kp", 0 /* Spending */, "forrásPersely", 200, 2014, 9);
    recalc();
    assert.equal(persely.currentValue(), 150);

    assert.equal(budgetEntryForExpense1.balance(), 0);
    assert.equal(budgetEntryForSave1.balance(), 0);

    assert.equal(budgetEntryForExpense2.balance(), 200);
    assert.equal(budgetEntryForSave2.balance(), 150);

    assert.equal(budgetEntryForExpense3.balance(), (200 + 300) - 200, "Előző hónapról 200 maradt, ebben a hónapban 300 van, és abból 200 költés");
    assert.equal(budgetEntryForSave3.balance(), 150);
    assert.equal(place.myValue(), -(100 + 150 + 200));
    assert.equal(place.sumValue(), -(100 + 200));
});

QUnit.test("Költés Budget nélkül szabályos", function (assert) {
    var srcPlace = createPlace("kp");
    createPersely("forrásPersely", srcPlace);
    createPersely("célPersely", srcPlace);
    var budget = createBudget(2014, 7);

    createTransaction("kp", 0 /* Spending */, "célPersely", 100, 2014, 7);
    recalc();
    assert.equal(true, true);
});

QUnit.test("Initializing place", function (assert) {
    var srcPlace = createPlace("kp");
    var budget = createBudget(2014, 7);

    recalc();
    assert.equal(srcPlace.sumValue(), 0);
    assert.equal(srcPlace.myValue(), 0);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "kp", 100, 2014, 7);
    recalc();
    assert.equal(srcPlace.sumValue(), 100);
    assert.equal(srcPlace.myValue(), 100);
});

QUnit.test("Initializing place and their Perselys", function (assert) {
    var srcPlace = createPlace("kp");
    var placePersely = createPersely("placePersely", srcPlace);
    var budget = createBudget(2014, 7);

    recalc();
    assert.equal(srcPlace.sumValue(), 0);
    assert.equal(srcPlace.myValue(), 0);
    assert.equal(placePersely.currentValue(), 0);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "kp", 100, 2014, 7);
    recalc();
    assert.equal(srcPlace.sumValue(), 100);
    assert.equal(srcPlace.myValue(), 100);
    assert.equal(placePersely.currentValue(), 0);

    createTransaction("kp", 2 /* IgnoreInBudgetFlagging */, "placePersely", 100, 2014, 7);
    recalc();
    assert.equal(srcPlace.sumValue(), 100);
    assert.equal(srcPlace.myValue(), 0);
    assert.equal(placePersely.currentValue(), 100);
});

QUnit.test("Spending from Place", function (assert) {
    var srcPlace = createPlace("kp");
    createPersely("forrásPersely", srcPlace);
    createPersely("célPersely", srcPlace);
    var budget = createBudget(2014, 7);

    recalc();
    assert.equal(srcPlace.sumValue(), 0);
    assert.equal(srcPlace.myValue(), 0);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "kp", 500, 2014, 7);
    createTransaction("kp", 0 /* Spending */, "célPersely", 100, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "célPersely", 100, 2014, 7);
    createTransaction("kp", 0 /* Spending */, "célPersely", 100, 2014, 7);
    recalc();
    assert.equal(srcPlace.myValue(), 200);
    assert.equal(srcPlace.sumValue(), 300);
});

QUnit.test("Spending from A (which is a plance for B) to B", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("Nyaralás", place);

    var budget = createBudget(2014, 7);
    var budgetEntryForExpense = createBudgetEntry(budget, "Nyaralás", 100, 0 /* Expense */);
    var budgetEntryForSave = createBudgetEntry(budget, "Nyaralás", 100, 1 /* Save */);

    recalc();
    assert.equal(place.sumValue(), 0);
    assert.equal(place.myValue(), 0);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 0);
    assert.equal(persely.currentValue(), 0);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "kp", 200, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "Nyaralás", 100, 2014, 7);
    recalc();
    assert.equal(persely.currentValue(), 100);
    assert.equal(place.sumValue(), 200);
    assert.equal(place.myValue(), 100);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 100);

    createTransaction("kp", 0 /* Spending */, "Nyaralás", 100, 2014, 7);
    recalc();
    assert.equal(persely.currentValue(), 100);
    assert.equal(place.sumValue(), 100, "200-ból 100at elköltöttünk, a másik százat csak átutaltuk a nyaralásra, de attól az még beleszámít a sumba");
    assert.equal(place.myValue(), 0);
    assert.equal(budgetEntryForExpense.balance(), 0);
    assert.equal(budgetEntryForSave.balance(), 100);
});

QUnit.test("Spending from A to A", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("Nyaralás", place);

    var budget = createBudget(2014, 7);
    var budgetEntryForExpense = createBudgetEntry(budget, "Nyaralás", 100, 0 /* Expense */);
    var budgetEntryForSave = createBudgetEntry(budget, "Nyaralás", 100, 1 /* Save */);

    recalc();
    assert.equal(place.sumValue(), 0);
    assert.equal(place.myValue(), 0);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 0);
    assert.equal(persely.currentValue(), 0);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "kp", 200, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "Nyaralás", 100, 2014, 7);
    recalc();
    assert.equal(persely.currentValue(), 100);
    assert.equal(place.sumValue(), 200);
    assert.equal(place.myValue(), 100);
    assert.equal(budgetEntryForExpense.balance(), 100);
    assert.equal(budgetEntryForSave.balance(), 100);

    createTransaction("Nyaralás", 0 /* Spending */, "Nyaralás", 100, 2014, 7);
    recalc();
    assert.equal(persely.currentValue(), 0);
    assert.equal(place.sumValue(), 100, "200-ból 100at elköltöttünk, a másik százat csak átutaltuk a nyaralásra, de attól az még beleszámít a sumba");
    assert.equal(place.myValue(), 100);
    assert.equal(budgetEntryForExpense.balance(), 0);
    assert.equal(budgetEntryForSave.balance(), 100);
});

QUnit.test("Balance honaprol honaóra", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("Nyaralás", place);

    var budget = createBudget(2014, 7);
    var budgetEntryForExpense = createBudgetEntry(budget, "Nyaralás", 100, 0 /* Expense */);
    var budgetEntryForSave = createBudgetEntry(budget, "Nyaralás", 150, 1 /* Save */);

    var budget2 = createBudget(2014, 8);
    var budgetEntryForExpense2 = createBudgetEntry(budget2, "Nyaralás", 100, 0 /* Expense */);
    var budgetEntryForSave2 = createBudgetEntry(budget2, "Nyaralás", 100, 1 /* Save */);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "kp", 200, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "Nyaralás", 150, 2014, 7);
    createTransaction("Nyaralás", 0 /* Spending */, "Nyaralás", 50, 2014, 7);

    recalc();
    assert.equal(budgetEntryForExpense.balance(), 50);
    assert.equal(budgetEntryForSave.balance(), 150);
    assert.equal(budgetEntryForExpense2.balance(), 150);
    assert.equal(budgetEntryForSave2.balance(), 150); // 150 / 250
    assert.equal(persely.currentValue(), 100, "150-et kapott a kp-ból, amiből elktöltött 50-et");
    assert.equal(place.sumValue(), 150, "200-at adtam, átrakott 150-et Nyaralásba, de abból költöttem 50,et");
    assert.equal(place.myValue(), 50, "200-at adtam, átrakott 150-et Nyaralásba");
});

QUnit.test("Balance honaprol honaóra, budget sorrend nem számít!", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("Nyaralás", place);

    var budget = createBudget(2014, 8);
    var budgetEntryForExpense = createBudgetEntry(budget, "Nyaralás", 100, 0 /* Expense */);
    var budgetEntryForSave = createBudgetEntry(budget, "Nyaralás", 150, 1 /* Save */);

    var budget2 = createBudget(2014, 7);
    var budgetEntryForExpense2 = createBudgetEntry(budget2, "Nyaralás", 100, 0 /* Expense */);
    var budgetEntryForSave2 = createBudgetEntry(budget2, "Nyaralás", 100, 1 /* Save */);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "kp", 200, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "Nyaralás", 150, 2014, 7);
    createTransaction("Nyaralás", 0 /* Spending */, "Nyaralás", 50, 2014, 7);

    recalc();
    assert.equal(budgetEntryForExpense.balance(), 150);
    assert.equal(budgetEntryForSave.balance(), 150, "Az első hónapban felment 0-ról 150-re, mivel ráFlaggeltem pénzt, a másodikban maradt változatlan");
    assert.equal(budgetEntryForExpense2.balance(), 50);
    assert.equal(budgetEntryForSave2.balance(), 150);
    assert.equal(persely.currentValue(), 100, "150 - 50 költés");
    assert.equal(place.sumValue(), 150, "200-at adtam, átrakott 150-et Nyaralásba, de abból költöttem 50,et");
    assert.equal(place.myValue(), 50, "200-at adtam, átrakott 150-et Nyaralásba, maradt 50");
});

QUnit.test("Balance(save) honaprol honaóra!", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("Nyaralás", place);

    var budget = createBudget(2014, 7);
    var budgetEntryForSave = createBudgetEntry(budget, "Nyaralás", 150, 1 /* Save */);

    var budget2 = createBudget(2014, 8);
    var budgetEntryForSave2 = createBudgetEntry(budget2, "Nyaralás", 150, 1 /* Save */);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "kp", 500, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "Nyaralás", 150, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "Nyaralás", 150, 2014, 8);

    recalc();
    assert.equal(budgetEntryForSave.balance(), 150);
    assert.equal(budgetEntryForSave2.balance(), 300);
});

QUnit.test("Gyűjtés esetén a táblázat balance-ába a persely összege kerül!", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("Nyaralás", place);

    var budget = createBudget(2014, 7);
    var budgetEntryForSave = createBudgetEntry(budget, "Nyaralás", 150, 1 /* Save */);

    var budget2 = createBudget(2014, 8);
    var budgetEntryForSave2 = createBudgetEntry(budget2, "Nyaralás", 150, 1 /* Save */);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "kp", 500, 2014, 7);
    createTransaction("kp", 2 /* IgnoreInBudgetFlagging */, "Nyaralás", 200, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "Nyaralás", 150, 2014, 7);
    createTransaction("kp", 1 /* Flagging */, "Nyaralás", 150, 2014, 8);

    recalc();
    assert.equal(budgetEntryForSave.balance(), 350, "Az első hónapban felment 0-ról 150-re, mivel ráFlaggeltem pénzt, a másodikban maradt változatlan");
    assert.equal(budgetEntryForSave2.balance(), 500);
});

QUnit.test("Hónapokon átívelő információk", function (assert) {
    var place = createPlace("kp");
    var persely = createPersely("forrásPersely", place);
    var budget1 = createBudget(2014, 7);
    var budgetEntryForExpense1 = createBudgetEntry(budget1, "forrásPersely", 100, 0 /* Expense */);
    var budgetEntryForSave1 = createBudgetEntry(budget1, "forrásPersely", 100, 1 /* Save */);
    var budget2 = createBudget(2014, 8);
    var budgetEntryForExpense2 = createBudgetEntry(budget2, "forrásPersely", 200, 0 /* Expense */);
    var budgetEntryForSave2 = createBudgetEntry(budget2, "forrásPersely", 200, 1 /* Save */);
    var budget3 = createBudget(2014, 9);
    var budgetEntryForExpense3 = createBudgetEntry(budget3, "forrásPersely", 300, 0 /* Expense */);
    var budgetEntryForSave3 = createBudgetEntry(budget3, "forrásPersely", 300, 1 /* Save */);

    createTransaction(null, 2 /* IgnoreInBudgetFlagging */, "kp", 500, 2014, 7);
    createTransaction(null, 1 /* Flagging */, "kp", 1000, 2014, 7); // fizetés
    createTransaction("kp", 1 /* Flagging */, "forrásPersely", 100, 2014, 7);
    createTransaction("kp", 0 /* Spending */, "forrásPersely", 100, 2014, 7);

    createTransaction("kp", 0 /* Spending */, "forrásPersely", 2000, 2014, 8);
    recalc();
    assert.equal(budget1.available_to_budget(), 1500 - 200 - 100, "500 van a perselyben, 1000 volt a bevétel, és beterveztem 100-at 100-at.");
    assert.equal(budget1.available_to_budget(), 1500 - 200 - 100, "A perselben levő pénzek nem tervezhetőek!");
    assert.equal(budget1.overspending_in_prev_month(), 0, "overspend");
    assert.equal(budget1.not_budgeted_in_prev_month(), 0, "not budgeted");
    assert.equal(budget1.income(), 1000, "income");
    assert.equal(budget1.budgeted(), 200, "planned");

    assert.equal(budget2.available_to_budget(), 1500 - 200 - 100 - 400, "Az előző hónapból lejön az ehavi 2*200-as terv");
    assert.equal(budget2.overspending_in_prev_month(), 0, "overspend");
    assert.equal(budget2.not_budgeted_in_prev_month(), 1500 - 200 - 100, "1500-ból csak 200-at tervezett be, és 100 át van csoportositva");
    assert.equal(budget2.income(), 0, "income");
    assert.equal(budget2.budgeted(), 400, "planned");

    assert.equal(budget3.available_to_budget(), 1500 - (200 + 100 + 400 + 600), "Az előző hónapból lejön az ehavi 2*300-as terv");

    //assert.equal(budget3.overspending_in_prev_month(), 1800, "200 volt betervezve, de 2000 lett elköltve");
    assert.equal(budget3.not_budgeted_in_prev_month(), 1500 - 200 - 400 - 100, "1500-ból csak a 7. havi 200, és a 8. havi 400 jön le, meg az átcsoportosított 100");
    assert.equal(budget3.income(), 0, "income");
    assert.equal(budget3.budgeted(), 600, "planned");
});
//# sourceMappingURL=tests.js.map
