/// <reference path="bootstrap.d.ts" />
/// <reference path="knockout.d.ts" />
/// <reference path="knockout.mapping.d.ts" />
/// <reference path="common.ts" />
/// <reference path="locale_hu.ts" />
var Persely = (function () {
    function Persely(id, place, name, goal_value, img_link) {
        this.editingBackend = {
            id: ko.observable(0),
            name: ko.observable(""),
            img_link: ko.observable(""),
            goal_value: ko.observable(0),
            place_name: ko.observable("")
        };
        this.id = ko.observable(id);
        this.place = ko.observable(place);
        this.name = ko.observable(name);
        this.img_link = ko.observable(img_link);
        this.currentValue = ko.observable(0);
        this.goal_value = ko.observable(goal_value);
        this.currentValuePercent = ko.computed(function () {
            return this.currentValue() / this.goal_value();
        }, this);
        this.editing = ko.observable(false);
    }
    Persely.prototype.edit = function () {
        var oldEditState = this.editing();
        var openEditor = oldEditState == false;
        if (openEditor) {
            this.openEditor();
        }
        this.editing(!oldEditState);
    };

    Persely.prototype.openEditor = function () {
        this.editingBackend.id(this.id());
        this.editingBackend.name(this.name());
        this.editingBackend.img_link(this.img_link());
        this.editingBackend.goal_value(this.goal_value());
        if (this.place() != null) {
            this.editingBackend.place_name(this.place().name());
        }
    };

    Persely.prototype.save = function () {
        this.img_link(this.editingBackend.img_link());
        this.name(this.editingBackend.name());
        this.goal_value(this.editingBackend.goal_value());
        var placeName = this.editingBackend.place_name();
        var place = Model.getPlace(placeName);
        if (place == null) {
            alert("Place is null! " + placeName);
        }
        this.place(place);
        this.editing(false);
        if (this.editingBackend.id() == 0) {
            var result = sendData({ command: "addPersely", persely: this.editingBackend });
            this.id(result.id);
            Model.perselyek.push(this);
        } else {
            sendData({ command: "updatePersely", persely: this.editingBackend });
        }
        Model.recalc();
        resizePerselyImages();
    };
    return Persely;
})();

var BudgetEntry = (function () {
    function BudgetEntry(id, budgeted_to, budgeted, planning_type) {
        this.editingBackend = {
            id: ko.observable(0),
            budgeted_to: ko.observable(""),
            budgeted: ko.observable(0),
            planning_type: ko.observable(0 /* Expense */),
            year: ko.observable(0), month: ko.observable(0),
            is_allando: ko.observable(false)
        };
        this.id = ko.observable(id);
        this.budgeted_to = ko.observable(budgeted_to);
        this.budgeted = ko.observable(budgeted);
        this.spent = ko.observable(0);
        this.planning_type = ko.observable(planning_type);
        this.editing = ko.observable(false);
        this.year = ko.observable(0);
        this.month = ko.observable(0);
        this.is_allando = ko.observable(false);

        this.balance = ko.observable(0);

        this.remainingPercent = ko.computed(function () {
            if (this.balance() <= 0) {
                return 0;
            }
            return Math.floor(this.balance() / this.budgeted() * 100);
        }, this);

        this.spentPercent = ko.computed(function () {
            if (this.balance() <= 0) {
                return 0;
            }
            return Math.floor(this.spent() / this.budgeted() * 100);
        }, this);

        this.is_full = ko.computed(function () {
            return this.spent() == this.budgeted();
        }, this);
    }
    BudgetEntry.prototype.fill_editing_backend = function () {
        this.editingBackend.id(this.id());
        this.editingBackend.budgeted_to(this.budgeted_to());
        this.editingBackend.budgeted(this.budgeted());
        this.editingBackend.planning_type(this.planning_type());
        this.editingBackend.year(this.year());
        this.editingBackend.month(this.month());
        this.editingBackend.is_allando(this.is_allando());
    };

    BudgetEntry.prototype.fill_this_from_editing_backend = function () {
        this.budgeted_to(this.editingBackend.budgeted_to());
        this.budgeted(this.editingBackend.budgeted());
        this.planning_type(Number(this.editingBackend.planning_type()));
        this.year(this.editingBackend.year());
        this.month(this.editingBackend.month());
        this.is_allando(this.editingBackend.is_allando());
    };

    BudgetEntry.prototype.beginEditing = function (index) {
        this.fill_editing_backend();
        this.editingBackend.is_allando(index != 2);
        this.editingBackend.planning_type(index > 0 ? 0 /* Expense */ : 1 /* Save */);
        this.editing(true);
        Model.editingBudgetEntry(this);
        $('#budget_entry_modal').modal('show');
    };

    BudgetEntry.prototype.persist = function () {
        this.fill_editing_backend();
        var result = sendData({ command: "addBudgetEntry", budget_entry: this.editingBackend });
        this.id(result.id);
    };

    BudgetEntry.prototype.commitEditing = function () {
        this.editing(false);
        if (this.editingBackend.id() == 0) {
            var result = sendData({ command: "addBudgetEntry", budget_entry: this.editingBackend });
            this.id(result.id);
            Model.getBudget(this.editingBackend.year(), this.editingBackend.month()).budgetEntries.push(this);
        } else {
            sendData({ command: "updateBudgetEntry", budget_entry: this.editingBackend });
        }
        this.fill_this_from_editing_backend();
        Model.recalc();
        resizePerselyImages();
        $('#budget_entry_modal').modal('hide');
    };

    BudgetEntry.prototype.delete = function () {
        var removed_entries = Model.deleteBudgetEntries(this.budgeted_to(), this.year(), this.month());
        sendData({ command: "deleteBudgetEntry", removed_entry_ids: removed_entries.map(function (entry) {
                return entry.id();
            }) });
        Model.recalc();
        resizePerselyImages();
        $('#budget_entry_modal').modal('hide');
    };

    BudgetEntry.prototype.rollbackEditing = function () {
        this.editing(false);
        $('#budget_entry_modal').modal('hide');
    };

    BudgetEntry.prototype.make_balance_zero = function () {
        this.fill_editing_backend();
        if (this.balance() < 0) {
            this.editingBackend.budgeted(Number(this.budgeted()) + (Math.abs(this.balance())));
        } else {
            this.editingBackend.budgeted(Number(this.budgeted()) - Number(this.balance()));
        }
        sendData({ command: "updateBudgetEntry", budget_entry: this.editingBackend });
        this.fill_this_from_editing_backend();
        Model.recalc();
        resizePerselyImages();
    };
    return BudgetEntry;
})();

var Budget = (function () {
    function Budget(year, month) {
        this.budgetEntries = ko.observableArray([]);
        this.year = ko.observable(year);
        this.month = ko.observable(month);

        this.isNewRowVisible = ko.observable(false);
        this.newBudgetEntry = null;

        this.not_budgeted_in_prev_month = ko.observable(0);
        this.overspending_in_prev_month = ko.observable(0);
        this.budgeted = ko.observable(0);
        this.income = ko.observable(0);
        this.available_to_budget = ko.observable(0);

        this.budgetEntrySections = ko.computed(function () {
            var allandoSavings = [];
            var allandoExpenses = [];
            var notAllando = [];

            this.budgetEntries().forEach(function (budgetEntry) {
                if (budgetEntry.is_allando() && budgetEntry.planning_type() == 1 /* Save */) {
                    allandoSavings.push(budgetEntry);
                } else if (budgetEntry.is_allando() && budgetEntry.planning_type() == 0 /* Expense */) {
                    allandoExpenses.push(budgetEntry);
                } else {
                    notAllando.push(budgetEntry);
                }
            });
            return [allandoSavings, allandoExpenses, notAllando];
        }, this);
    }
    Budget.prototype.begin_budget_entry_editing = function (index) {
        this.newBudgetEntry = ko.observable(new BudgetEntry(0, '', 0, 0 /* Expense */));
        this.newBudgetEntry().year(this.year());
        this.newBudgetEntry().month(this.month());
        this.newBudgetEntry().beginEditing(index);
    };
    return Budget;
})();

var Place = (function () {
    function Place(id, name) {
        this.editingBackend = {
            id: ko.observable(0),
            name: ko.observable("")
        };
        this.id = ko.observable(id);
        this.name = ko.observable(name);
        this.myValue = ko.observable(0);
        this.editing = ko.observable(false);
        this.perselyek = ko.observableArray([]);

        this.sumValue = ko.computed(function () {
            var currentValue = this.myValue();
            this.perselyek().forEach(function (persely) {
                currentValue += persely.currentValue();
            });
            return currentValue;
        }, this);
    }
    Place.prototype.fill_editing_backend = function () {
        this.editingBackend.id(this.id());
        this.editingBackend.name(this.name());
    };

    Place.prototype.fill_this_from_editing_backend = function () {
        this.name(this.editingBackend.name());
    };

    Place.prototype.beginEditing = function () {
        this.fill_editing_backend();
        this.editing(true);
    };

    Place.prototype.persist = function () {
        this.fill_editing_backend();
        var result = sendData({ command: "addPlace", budget_entry: this.editingBackend });
        this.id(result.id);
    };

    Place.prototype.commitEditing = function () {
        this.editing(false);
        if (this.editingBackend.id() == 0) {
            var result = sendData({ command: "addPlace", place: this.editingBackend });
            this.id(result.id);
        } else {
        }
        this.fill_this_from_editing_backend();
        Model.recalc();
        resizePerselyImages();
    };

    Place.prototype.delete_me = function () {
        sendData({ command: "deletePlace", place_id: this.id() });
        Model.places.remove(this);
        Model.recalc();
        resizePerselyImages();
    };

    Place.prototype.rollbackEditing = function () {
        this.editing(false);
        Model.places.remove(this);
    };
    return Place;
})();

var TransactionType;
(function (TransactionType) {
    TransactionType[TransactionType["Spending"] = 0] = "Spending";
    TransactionType[TransactionType["Flagging"] = 1] = "Flagging";
    TransactionType[TransactionType["IgnoreInBudgetFlagging"] = 2] = "IgnoreInBudgetFlagging";
})(TransactionType || (TransactionType = {}));

var PlanningType;
(function (PlanningType) {
    PlanningType[PlanningType["Expense"] = 0] = "Expense";
    PlanningType[PlanningType["Save"] = 1] = "Save";
})(PlanningType || (PlanningType = {}));

var Transaction = (function () {
    function Transaction() {
        this.editingBackend = {
            id: ko.observable(0),
            src: ko.observable(""),
            dst: ko.observable(""),
            descr: ko.observable(""),
            tx_type: ko.observable(0 /* Spending */),
            dateStr: ko.observable(""),
            value: ko.observable(0)
        };
        this.id = ko.observable(0);
        this.src = ko.observable("");
        this.dst = ko.observable("");
        this.descr = ko.observable("");
        this.tx_type = ko.observable(0 /* Spending */);
        this.value = ko.observable(0);
        this.year = ko.observable(0);
        this.month = ko.observable(0);
        this.day = ko.observable(0);
        this.src_current_value = ko.observable("");
        this.dst_current_value = ko.observable("");
        this.editing = ko.observable(false);
        this.alert_msg = ko.observable(null);

        this.dateStr = ko.computed(function () {
            return this.year() + "-" + pad(this.month(), 2, '0') + "-" + pad(this.day(), 2, '0');
        }, this);

        this.is_valid = ko.computed(function () {
            if (Number(this.editingBackend.tx_type()) == 0 /* Spending */) {
                if (this.editingBackend.src() == null || this.editingBackend.dst() == "") {
                    return false;
                }
            }
            return this.editingBackend.dst() != "";
        }, this);
    }
    Transaction.prototype.fillEditingBackend = function () {
        this.editingBackend.id(this.id());
        this.editingBackend.tx_type(this.tx_type());
        this.editingBackend.dst(this.dst());
        this.editingBackend.src(this.src());
        this.editingBackend.dateStr(this.dateStr());
        this.editingBackend.value(this.value());
        this.editingBackend.descr(this.descr());
    };

    Transaction.prototype.beginEditing = function () {
        this.fillEditingBackend();
        this.editing(true);
        Model.there_is_editing_tx(true);
    };

    Transaction.prototype.commitEditing = function () {
        if (this.editingBackend.id() == 0) {
            var result = sendData({ command: "addTransaction", transaction: this.editingBackend });
            this.id(result.id);
            Model.transactions.push(this);
        } else {
            sendData({ command: "updateTransaction", transaction: this.editingBackend });
        }
        this.src(this.editingBackend.src());
        this.dst(this.editingBackend.dst());
        this.descr(this.editingBackend.descr());
        this.tx_type(Number(this.editingBackend.tx_type()));
        var dateParts = this.editingBackend.dateStr().split("-").map(function (strPatr) {
            return parseInt(strPatr);
        });
        this.year(dateParts[0]);
        this.month(dateParts[1]);
        this.day(dateParts[2]);
        this.value(Number(this.editingBackend.value()));
        this.editing(false);
        Model.there_is_editing_tx(false);
        Model.recalc();
        Model.filter_transactions();
        resizePerselyImages();
    };

    Transaction.prototype.rollbackEditing = function () {
        this.editing(false);
        Model.there_is_editing_tx(false);
        var iThisANewRow = this.editingBackend.id() == null || this.editingBackend.id() == 0;
        if (iThisANewRow) {
            Model.editing_transactions.remove(this);
            Model.transactions.remove(this);
        }
    };
    return Transaction;
})();

var TransactionFilter = (function () {
    function TransactionFilter() {
        this.from_value = ko.observable(null);
        this.to_value = ko.observable(null);
        this.src = ko.observable(null);
        this.dst = ko.observable(null);
        this.tx_type = ko.observable(null);
        this.descr = ko.observable(null);

        this.from_date_str = ko.observable(null);
        this.to_date_str = ko.observable(null);
        this.bool_logic = ko.observable("and");
    }
    TransactionFilter.prototype.clear = function () {
        this.from_date_str(null);
        this.to_date_str(null);

        this.bool_logic("and");
        this.descr(null);
        this.dst(null);
        this.src(null);
        this.from_value(null);
        this.to_value(null);
        this.tx_type(null);
    };
    return TransactionFilter;
})();

var PiggyModel = (function () {
    function PiggyModel(lang) {
        this.PERSELY_IMG_W = ko.observable(100);
        this.PERSELY_IMG_H = ko.observable(100);

        this.there_is_editing_tx = ko.observable(false);

        this.username = ko.observable("");

        this.common_tx_src_for_spend_dst = ko.observable({});
        this.common_tx_src_for_save_dst = ko.observable({});

        this.transaction_filter = new TransactionFilter();

        this.editingBudgetEntry = ko.observable(null);

        this.newPersely = ko.observable(new Persely(0, null, '', 0, ''));
        this.editing_transactions = ko.observableArray([]);

        this.perselyek = ko.observableArray([]);
        this.budgets = ko.observableArray([]);
        this.transactions = ko.observableArray([]);
        this.places = ko.observableArray([]);

        this.lang = ko.observable(LocaleGetter.get(lang));

        this.monthNames = ko.observableArray(this.lang().monthNames);
        this.selectedBudgetYear = ko.observable(new Date().getFullYear());
        this.selectedBudgetMonthNullBasedIndex = ko.observable(new Date().getMonth());
        this.currentBudgetMonthNullBasedIndex = ko.observable(new Date().getMonth());

        this.budgetMonths = ko.computed(function () {
            var retarr = [];
            var from = this.selectedBudgetMonthNullBasedIndex();
            var max = Math.min(from + 3, 13);
            if (max - from < 3) {
                from -= 3 - (max - from);
            }
            for (var k = from; k < max; k++) {
                var budget = this.getBudget(this.selectedBudgetYear(), k);
                if (budget == null) {
                    continue;
                }
                retarr.push(budget);
            }
            return retarr;
        }, this);
    }
    PiggyModel.prototype.fill = function (places, perselyek, budgets, transactions) {
        this.perselyek(perselyek);
        this.budgets(budgets);
        this.transactions(transactions);
        this.places(places);
    };

    PiggyModel.prototype.logout = function () {
        this.username("");
        sendData({ command: "logout" });
    };

    PiggyModel.prototype.valid_src_names_for_tx = function (tx) {
        if (Number(tx.editingBackend.tx_type()) == 0 /* Spending */ && this.getPersely(tx.editingBackend.dst()) != null) {
            return [tx.editingBackend.dst()];
        }
        var retarr = [null];
        for (var k = 0; k < this.places().length; k++) {
            retarr.push(this.places()[k].name());
        }
        return retarr;
    };

    PiggyModel.prototype.deleteBudgetEntries = function (name, from_year, from_month) {
        var arr = [];
        this.budgets().forEach(function (budget) {
            var removed_elems = (budget.budgetEntries.remove(function (budgetEntry) {
                return budgetEntry.budgeted_to() == name && budgetEntry.year() >= from_year && budgetEntry.month() >= from_month;
            }));
            if (removed_elems.length > 0) {
                arr.push(removed_elems[0]);
            }
        });
        return arr;
    };

    PiggyModel.prototype.valid_dst_names_for_tx = function (tx) {
        var unique_names = {};
        var ret = [];
        if (Number(tx.editingBackend.tx_type()) != 0 /* Spending */) {
            for (var k = 0; k < this.places().length; k++) {
                var place = this.places()[k];
                unique_names[place.name()] = true;
            }
        }
        for (var k = 0; k < this.budgets().length; k++) {
            var budget = this.budgets()[k];
            for (var i = 0; i < budget.budgetEntries().length; i++) {
                unique_names[budget.budgetEntries()[i].budgeted_to()] = true;
            }
        }
        for (var k = 0; k < this.perselyek().length; k++) {
            var persely = this.perselyek()[k];
            unique_names[persely.name()] = true;
        }
        for (var key in unique_names) {
            ret.push(key);
        }
        return ret;
    };

    PiggyModel.prototype.validateBudgets = function () {
        var _this = this;
        this.budgets().forEach(function (budget) {
            var sameMonthAndYearBudgets = _this.budgets().filter(function (other) {
                return other.month() == budget.month() && other.year() == budget.year();
            });
            if (sameMonthAndYearBudgets.length != 1) {
                alert("Több Budget rendelkezik ugyanazzal az évvel és hónappal! " + budget.year() + "." + budget.month());
            }
        });
    };

    PiggyModel.prototype.hasPlace = function (placeName) {
        for (var i = 0; i < this.places().length; ++i) {
            if (this.places()[i].name() === placeName) {
                return true;
            }
        }
        return false;
    };

    PiggyModel.prototype.selectBudgetMonth = function (newValue) {
        this.selectedBudgetMonthNullBasedIndex(newValue);
    };

    PiggyModel.prototype.selectBudgetYear = function (newValue) {
        this.selectedBudgetYear(newValue);
    };

    PiggyModel.prototype.saveNewPersely = function () {
        this.newPersely().save();
        this.newPersely(new Persely(0, null, '', 0, ''));
    };

    PiggyModel.prototype.tx_type_to_str = function (tx_type) {
        switch (tx_type) {
            case 0 /* Spending */:
                return "Költés";
            case 1 /* Flagging */:
                return "Átcsoportosítás";
            case 2 /* IgnoreInBudgetFlagging */:
                return "Rejtett Átcsoportosítás";
        }
    };

    PiggyModel.prototype.openTransactionsForBudgetEntryAddNew = function (budgetEntry, index) {
        var tx_type = 0 /* Spending */;
        var src = "";
        var dst = budgetEntry.budgeted_to();
        var value = 0;
        if (index == 0) {
            tx_type = 1 /* Flagging */;
            value = budgetEntry.budgeted();
            src = this.getPersely(dst).place().name();
        } else if (index > 0) {
            tx_type = 0 /* Spending */;
        }
        if (src == "") {
            src = Model.common_tx_src_for_spend_dst()[dst];
        }
        this.openTransactionsForBudgetEntry(budgetEntry);
        this.addNewTransactionToTheModalWindow(src, tx_type, dst, value);
    };

    PiggyModel.prototype.openTransactionsForBudgetEntry = function (budgetEntry) {
        var budgetYear = budgetEntry.year();
        var budgetmonth = budgetEntry.month();

        this.transaction_filter.clear();
        this.transaction_filter.from_date_str(to_date_str(budgetYear, budgetmonth, 1));
        this.transaction_filter.to_date_str(to_date_str(budgetYear, budgetmonth, 31));
        this.transaction_filter.dst(budgetEntry.budgeted_to());

        this.filter_transactions();

        $('#transactionsModal').modal('show');
        $('[title]').tooltip();
    };

    PiggyModel.prototype.openTransactionsForBudget = function (budget) {
        var budgetYear = budget.year();
        var budgetmonth = budget.month();

        this.transaction_filter.clear();
        this.transaction_filter.from_date_str(to_date_str(budgetYear, budgetmonth, 1));
        this.transaction_filter.to_date_str(to_date_str(budgetYear, budgetmonth, 31));

        this.filter_transactions();

        $('#transactionsModal').modal('show');
        $('[title]').tooltip();
    };

    PiggyModel.prototype.get_transactions_for_budget = function (budget) {
        var ret = [];
        for (var i = 0; i < this.transactions().length; ++i) {
            var tx = this.transactions()[i];
            var a = tx.year();
            var b = tx.month();
            var ca = budget.year();
            var dq = budget.month();
            if (tx.year() == budget.year() && tx.month() == budget.month()) {
                ret.push(tx);
            }
        }
        return ret;
    };

    PiggyModel.prototype.filter_transactions = function () {
        this.editing_transactions([]);
        for (var i = 0; i < this.transactions().length; ++i) {
            var src_result = null;
            var dst_result = null;
            var date_from_result = null;
            var date_to_result = null;
            var min_value_result = null;
            var max_value_result = null;
            var descr_result = null;
            var type_result = null;

            var tx = this.transactions()[i];
            var tx_date = to_date_str(tx.year(), tx.month(), tx.day());
            if (!null_or_empty(this.transaction_filter.from_date_str())) {
                date_from_result = !is_first_smaller_than_second(tx_date, this.transaction_filter.from_date_str());
            }
            if (!null_or_empty(this.transaction_filter.to_date_str())) {
                date_to_result = !is_first_smaller_than_second(this.transaction_filter.to_date_str(), tx_date);
            }
            if (!null_or_empty(this.transaction_filter.src())) {
                src_result = tx.src() != null && tx.src().indexOf(this.transaction_filter.src()) > -1;
            }
            if (!null_or_empty(this.transaction_filter.dst())) {
                dst_result = tx.dst() != null && tx.dst().indexOf(this.transaction_filter.dst()) > -1;
            }
            if (!null_or_empty(this.transaction_filter.descr())) {
                descr_result = tx.descr() != null && tx.descr().indexOf(this.transaction_filter.descr()) > -1;
            }
            if (!null_or_empty(this.transaction_filter.from_value())) {
                min_value_result = tx.value() >= parseInt(this.transaction_filter.from_value());
            }
            if (!null_or_empty(this.transaction_filter.to_value())) {
                max_value_result = tx.value() <= parseInt(this.transaction_filter.to_value());
            }
            if (!null_or_empty(this.transaction_filter.tx_type())) {
                var type_num = parseInt(this.transaction_filter.tx_type());
                if (type_num >= 0 && type_num <= 2) {
                    type_result = tx.tx_type() == type_num;
                }
            }

            if (this.transaction_filter.bool_logic() == "and") {
                if (src_result != null && !src_result) {
                    continue;
                } else if (dst_result != null && !dst_result) {
                    continue;
                } else if (date_from_result != null && !date_from_result) {
                    continue;
                } else if (date_to_result != null && !date_to_result) {
                    continue;
                } else if (descr_result != null && !descr_result) {
                    continue;
                } else if (min_value_result != null && !min_value_result) {
                    continue;
                } else if (max_value_result != null && !max_value_result) {
                    continue;
                } else if (type_result != null && !type_result) {
                    continue;
                }
            } else {
                var ok = false;
                ok = ok || src_result != null && src_result;
                ok = ok || dst_result != null && dst_result;
                ok = ok || date_from_result != null && date_from_result;
                ok = ok || date_to_result != null && date_to_result;
                ok = ok || descr_result != null && descr_result;
                ok = ok || min_value_result != null && min_value_result;
                ok = ok || max_value_result != null && max_value_result;
                ok = ok || type_result != null && type_result;

                if (!ok) {
                    continue;
                }
            }
            this.editing_transactions.unshift(tx);
        }

        this.transaction_filter.from_date_str(this.transaction_filter.from_date_str());
        this.transaction_filter.to_date_str(this.transaction_filter.to_date_str());
    };

    PiggyModel.saveTransactions = function () {
        $('#transactionsModal').modal('hide');
    };

    PiggyModel.prototype.deletePersely = function (p) {
        sendData(({ command: "deletePersely", persely_id: p.id }));
        this.perselyek.remove(p);
    };

    PiggyModel.prototype.deleteTransaction = function (tx) {
        if (tx.id() != null && tx.id() != 0) {
            sendData({ command: "deleteTransaction", tx_id: tx.id });
        }
        this.editing_transactions.remove(tx);
        this.transactions.remove(tx);
    };

    PiggyModel.prototype.addNewTransactionToTheModalWindow = function (src, tx_type, dst, value) {
        var tx = new Transaction();
        tx.src(src);
        tx.dst(dst ? dst : "");
        tx.tx_type(tx_type ? tx_type : 0 /* Spending */);
        var today = new Date();
        tx.year(today.getFullYear());
        tx.month(today.getMonth() + 1);
        tx.day(today.getDate());
        tx.value(value);
        this.editing_transactions.unshift(tx);
        setTimeout(function () {
            $(".tx_osszeg_input").first().focus();
            $(".tx_osszeg_input").first().select();
        }, 500);
        tx.beginEditing();
    };

    PiggyModel.prototype.getBudgetEntry = function (budget_entries, budgeted_to, planning_type) {
        var arr = budget_entries.filter(function (entry) {
            var sameSource = entry.budgeted_to() == budgeted_to;
            return sameSource && planning_type == entry.planning_type();
        });
        if (arr.length == 1) {
            return arr[0];
        } else if (arr.length > 1) {
            alert("Több BudgetEntry találat van ehhez: (dst, type) = (" + budgeted_to + ", " + planning_type + ")");
        }
    };

    PiggyModel.prototype.getBudgetEntryByDate = function (year, month, budgeted_to, planning_type) {
        var budget = this.getBudget(year, month);
        if (budget == null) {
            return null;
        }
        return this.getBudgetEntry(budget.budgetEntries(), budgeted_to, planning_type);
    };

    PiggyModel.prototype.has_alerted_tx = function (budget) {
        var transactionsForBudget = Model.get_transactions_for_budget(budget);
        for (var i = 0; i < transactionsForBudget.length; ++i) {
            var tx = transactionsForBudget[i];
            if (tx.alert_msg() != null) {
                return true;
            }
        }
        return false;
    };

    PiggyModel.prototype.getBudgetEntryOf = function (budgetEntries, tx) {
        return this.getBudgetEntry(budgetEntries, tx.dst(), tx.tx_type() == 0 /* Spending */ ? 0 /* Expense */ : 1 /* Save */);
    };

    PiggyModel.prototype.getPersely = function (perselyName) {
        var arr = this.perselyek().filter(function (persely) {
            return persely.name() === perselyName;
        });
        return arr ? arr[0] : null;
    };

    PiggyModel.prototype.getBudget = function (year, month) {
        var arr = this.budgets().filter(function (budget) {
            return budget.year() === year && budget.month() == month;
        });
        return arr ? arr[0] : null;
    };

    PiggyModel.prototype.add_new_place = function () {
        var place = new Place(0, "");
        place.beginEditing();
        this.places.push(place);
    };

    PiggyModel.prototype.decreaseSrc = function (src_name, tx) {
        var srcPersely = this.getPersely(src_name);
        var old_value = 0;
        if (srcPersely != null) {
            old_value = Number(srcPersely.currentValue());
            srcPersely.currentValue(Number(srcPersely.currentValue()) - Number(tx.value()));
        } else {
            var srcPlace = this.getPlace(src_name);
            if (srcPlace == null) {
                tx.alert_msg("Spend without src: " + src_name + " -> " + tx.dst);
                return;
            }
            old_value = srcPlace.myValue();
            srcPlace.myValue(Number(srcPlace.myValue()) - Number(tx.value()));
        }
        tx.src_current_value(tx_tooltip(old_value, -tx.value()));
    };

    PiggyModel.prototype.increaseDstPersely = function (perselyName, tx) {
        var persely = this.getPersely(perselyName);
        if (persely == null) {
            tx.alert_msg('increaseDstPersely: persely is null: ' + perselyName + ". Fleggingnél csak kategóriára lehessen költeni!");
            return;
        }
        var old_value = persely.currentValue();
        persely.currentValue(Number(persely.currentValue()) + Number(tx.value()));
        tx.dst_current_value(tx_tooltip(old_value, tx.value()));
    };

    PiggyModel.prototype.getPlace = function (placeName) {
        var arr = this.places().filter(function (place) {
            return place.name() == placeName;
        });
        return arr ? arr[0] : null;
    };

    PiggyModel.prototype.recalc = function () {
        var self = this;

        this.sort_budget_entries();
        this.sort_transactions();

        this.sort_budgets();

        self.places().forEach(function (place) {
            place.myValue(0);
        });
        self.perselyek().forEach(function (persely) {
            persely.currentValue(0);
        });

        self.budgets().forEach(function (budget) {
            budget.available_to_budget(0);
            budget.budgeted(0);
            budget.not_budgeted_in_prev_month(0);
            budget.overspending_in_prev_month(0);
            budget.income(0);
            budget.budgetEntries().forEach(function (budgetEntry) {
                budgetEntry.spent(0);
                if (budgetEntry.planning_type() == 1 /* Save */) {
                    budgetEntry.balance(0);
                } else {
                    budgetEntry.balance(budgetEntry.budgeted());
                }
                budget.available_to_budget(Number(budget.available_to_budget()) - Number(budgetEntry.budgeted()));
                budget.budgeted(Number(budget.budgeted()) + Number(budgetEntry.budgeted()));
            });
        });

        var prev_month = 0;
        for (var i = 0; i < self.transactions().length; ++i) {
            var tx = self.transactions()[i];
            var src_name = tx.src();
            var dst = tx.dst();
            if (tx.tx_type() === 0 /* Spending */) {
                self.decreaseSrc(src_name, tx);
                var budget = self.getBudget(tx.year(), tx.month());
                if (budget == null) {
                    return;
                }
                var entry = self.getBudgetEntryOf(budget.budgetEntries(), tx);
                if (entry != null) {
                    entry.spent(Number(entry.spent()) + Number(tx.value()));
                    entry.balance(Number(entry.balance()) - Number(tx.value()));
                }
            } else if (tx.tx_type() === 2 /* IgnoreInBudgetFlagging */ || tx.tx_type() === 1 /* Flagging */) {
                var dst_place = self.getPlace(dst);
                if (dst_place != null) {
                    var old_value = dst_place.myValue();
                    dst_place.myValue(Number(dst_place.myValue()) + Number(tx.value()));
                    tx.dst_current_value(tx_tooltip(old_value, tx.value()));
                    var budget = self.getBudget(tx.year(), tx.month());
                    if (budget != null) {
                        budget.available_to_budget(Number(budget.available_to_budget()) + Number(tx.value()));
                        console.log("available_to_budget(Flagging, dst_place) += " + numberWithCommas(tx.value()) + " ==== " + numberWithCommas(budget.available_to_budget()));
                        if (tx.tx_type() == 1 /* Flagging */) {
                            budget.income(Number(budget.income()) + Number(tx.value()));
                        }
                    }
                }

                var srcPersely = this.getPersely(src_name);
                var src_place = this.getPlace(src_name);
                var old_value = 0;
                if (srcPersely != null) {
                    old_value = srcPersely.currentValue();
                    srcPersely.currentValue(Number(srcPersely.currentValue()) - Number(tx.value()));
                } else if (src_place != null) {
                    old_value = src_place.myValue();
                    src_place.myValue(Number(src_place.myValue()) - Number(tx.value()));
                    if (tx.tx_type() === 2 /* IgnoreInBudgetFlagging */) {
                        var budget = self.getBudget(tx.year(), tx.month());
                        console.log("available_to_budget(Flagging) -= " + tx.value());
                        budget.available_to_budget(Number(budget.available_to_budget()) - Number(tx.value()));
                    }
                }
                tx.src_current_value(tx_tooltip(old_value, -tx.value()));
                if (dst_place == null) {
                    self.increaseDstPersely(dst, tx);
                    if (tx.tx_type() === 1 /* Flagging */) {
                        var budget = self.getBudget(tx.year(), tx.month());
                        if (budget == null) {
                            return;
                        }
                        var entry = self.getBudgetEntryOf(budget.budgetEntries(), tx);
                        if (entry != null) {
                            entry.spent(Number(entry.spent()) + Number(tx.value()));
                            entry.balance(Number(entry.balance()) + Number(tx.value()));
                        }
                    } else {
                        // Hozzáadom a Save Entry-khez az értéket, hogy a BudgetEntry táblázatban
                        // lássam, hogy az adott hónapban hol tartottam a persely értékében
                        // pl fundamenta havi 80 Ft
                        // 2000, 2080, 2160, 2240, stb
                        var budget = self.getBudget(tx.year(), tx.month());
                        if (budget == null) {
                            return;
                        }
                        var entry = self.getBudgetEntryOf(budget.budgetEntries(), tx);
                        if (entry != null) {
                            entry.balance(Number(entry.balance()) + Number(tx.value()));
                        }
                    }
                }
            } else {
                alert("Unknown tx_type " + tx.year() + ", " + tx.month() + ", " + tx.descr() + ", " + tx.value() + " = " + tx.tx_type());
            }
        }
        var szabad_penz = 0;
        for (var i = 0; i < self.places().length; ++i) {
            var place = self.places()[i];
            szabad_penz += Number(place.myValue());
        }

        var budgetEntryCurrentBalanceByName = {};
        for (var i = 0; i < self.budgets().length; ++i) {
            var budget = self.budgets()[i];
            budget.budgetEntries().forEach(function (budgetEntry) {
                var key = budgetEntry.budgeted_to() + budgetEntry.planning_type();
                if (budgetEntryCurrentBalanceByName[key] == null) {
                    budgetEntryCurrentBalanceByName[key] = 0;
                }
                budgetEntryCurrentBalanceByName[key] = Number(budgetEntryCurrentBalanceByName[key]) + Number(budgetEntry.balance());
                budgetEntry.balance(budgetEntryCurrentBalanceByName[key]);
            });
            if (i == 0) {
                //budget.available_to_budget(szabad_penz);
            } else if (i > 0) {
                var prev_budget = self.budgets()[i - 1];
                budget.available_to_budget(Number(budget.available_to_budget()) + Number(prev_budget.available_to_budget()));
                budget.not_budgeted_in_prev_month(prev_budget.available_to_budget());
                //budget.overspending_in_prev_month(budget.overspending_in_prev_month() - );
            }
        }
    };

    PiggyModel.prototype.sort_budgets = function () {
        this.budgets().sort(function (a, b) {
            if (a.year() == b.year()) {
                return a.month() < b.month() ? -1 : (a.month() > b.month() ? 1 : 0);
            } else {
                return a.year() < b.year() ? -1 : 1;
            }
        });
    };

    PiggyModel.prototype.sort_budget_entries = function () {
        this.budgets().forEach(function (budget) {
            budget.budgetEntries.sort(function (a, b) {
                var aName = a.budgeted_to().toLowerCase();
                var bName = b.budgeted_to().toLowerCase();
                return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
            });
        });
    };

    PiggyModel.prototype.sort_transactions = function () {
        this.transactions.sort(function (a, b) {
            if (a.year() == b.year()) {
                if (a.month() == b.month()) {
                    return a.day() < b.day() ? -1 : (a.day() > b.day() ? 1 : a.id() - b.id());
                } else {
                    return a.month() < b.month() ? -1 : 1;
                }
            } else {
                return a.year() < b.year() ? -1 : 1;
            }
        });
    };
    return PiggyModel;
})();


var Model;

function sendData(map) {
    var data = ko.toJSON(map);
    var ret;
    $.ajax({
        url: "/",
        type: "POST",
        crossDomain: true,
        data: data,
        dataType: "json",
        contentType: 'application/json; charset=UTF-8',
        async: false,
        success: function (result) {
            ret = result;
            if (ret.mustLogin) {
                map.username = prompt("login");
                if (map.username == null) {
                    return;
                }
                ret = sendData(map);
            }
        },
        error: function (xhr, ajaxOptions, thrownError) {
            alert(xhr.status);
            alert(thrownError);
        }
    });
    return ret;
}

function loadDataFromServerThenInitView() {
    Model = new PiggyModel("hu");
    var data = sendData({ command: "init" });
    Model.username(data.username);
    fillFromDownloadedData(data);
    ko.applyBindings(Model);
    resizePerselyImages();
}

function start_interval_pinging() {
    setInterval(function () {
        return sendData({ command: "ping" });
    }, 30000);
}

function fillFromDownloadedData(data) {
    var places = [];
    var perselyek = [];
    var placesByName = {};

    data.places.forEach(function (place_json) {
        var place = new Place(place_json.id, place_json.name);
        placesByName[place.name()] = place;
        places.push(place);
    });

    data.perselyek.forEach(function (persely_json) {
        if (placesByName[persely_json.place] == null) {
            alert("Nem létező Place: " + persely_json.place);
        }
        var place = placesByName[persely_json.place];
        var persely = new Persely(persely_json.id, place, persely_json.name, persely_json.goal_value, persely_json.img_link ? persely_json.img_link : null);
        perselyek.push(persely);
        place.perselyek.push(persely);
    });

    var budgetsByDate = {};
    var budgets = [];
    data.budget_entries.forEach(function (budgetEntryJson) {
        var planning_type;
        if (budgetEntryJson.planning_type.trim() == "Save") {
            planning_type = 1 /* Save */;
        } else if (budgetEntryJson.planning_type.trim() == "Expense") {
            planning_type = 0 /* Expense */;
        }
        var entry = new BudgetEntry(budgetEntryJson.id, budgetEntryJson.budgeted_to, budgetEntryJson.budgeted, planning_type);
        entry.is_allando(budgetEntryJson.is_allando);
        entry.year(budgetEntryJson.year);
        entry.month(budgetEntryJson.month);
        var budgetKey = budgetEntryJson.year + ', ' + budgetEntryJson.month;
        if (budgetsByDate[budgetKey] == null) {
            var newBudget = new Budget(budgetEntryJson.year, budgetEntryJson.month);
            budgetsByDate[budgetKey] = newBudget;
            budgets.push(newBudget);
        }
        budgetsByDate[budgetKey].budgetEntries.push(entry);
    });

    var currentYear = new Date().getFullYear();
    var currentMonth = new Date().getMonth();
    for (var i = 0; i < 12; ++i) {
        ++currentMonth;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }
        var currentMonthKey = currentYear + ', ' + currentMonth;
        if (budgetsByDate[currentMonthKey] == null) {
            var newBudget = new Budget(currentYear, currentMonth);
            budgetsByDate[currentMonthKey] = newBudget;
            budgets.push(newBudget);
        }
        var prevMonthKey = (currentMonth == 1 ? currentYear - 1 : currentYear) + ', ' + (currentMonth == 1 ? 12 : currentMonth - 1);
        var prevBudget = budgetsByDate[prevMonthKey];
        if (prevBudget == null) {
            continue;
        }
        var currentBudget = budgetsByDate[currentMonthKey];
        prevBudget.budgetEntries().forEach(function (budgetEntry) {
            var sameBudgetEntryInCurrentRow = currentBudget.budgetEntries().filter(function (currentBudgetEntry) {
                return currentBudgetEntry.budgeted_to() == budgetEntry.budgeted_to();
            });
            if (sameBudgetEntryInCurrentRow.length == 0 && budgetEntry.is_allando()) {
                var newBudgetEntry = new BudgetEntry(0, budgetEntry.budgeted_to(), budgetEntry.budgeted(), budgetEntry.planning_type());
                newBudgetEntry.year(currentYear);
                newBudgetEntry.month(currentMonth);
                newBudgetEntry.is_allando(true);
                newBudgetEntry.persist();
                currentBudget.budgetEntries().push(newBudgetEntry);
            }
        });
    }

    var transactions = [];

    // Tx -> Src_name -> Darabszám, hány dst-nél volt ez az src a forrás
    var tx_srcs_spend = {};
    var tx_srcs_save = {};
    data.transactions.forEach(function (tx_json) {
        var tx = new Transaction();
        tx.id(tx_json.id);
        tx.src(tx_json.src);
        tx.dst(tx_json.dst);
        tx.descr(tx_json.descr);
        if (tx_json.tx_type.trim() == "Spending") {
            tx_srcs_spend[tx.dst()] = tx.src();
            tx.tx_type(0 /* Spending */);
        } else if (tx_json.tx_type.trim() == "Flagging") {
            tx_srcs_save[tx.dst()] = tx.src();
            tx.tx_type(1 /* Flagging */);
        } else if (tx_json.tx_type.trim() == "IgnoreInBudgetFlagging") {
            tx.tx_type(2 /* IgnoreInBudgetFlagging */);
        }
        tx.year(tx_json.year);
        tx.month(tx_json.month);
        tx.day(tx_json.day);
        tx.value(tx_json.value);
        tx.fillEditingBackend();
        transactions.push(tx);
        var budgetKey = tx_json.year + ', ' + tx_json.month;
        if (budgetsByDate[budgetKey] == null) {
            var newBudget = new Budget(tx_json.year, tx_json.month);
            budgetsByDate[budgetKey] = newBudget;
            budgets.push(newBudget);
        }
    });

    ko.bindingHandlers.numericText = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var formattedValue = numberWithCommas(value);

            ko.bindingHandlers.text.update(element, function () {
                return formattedValue;
            }, null, null, null);
        },
        defaultPrecision: 1
    };

    Model.fill(places, perselyek, budgets, transactions);
    Model.common_tx_src_for_spend_dst(tx_srcs_spend);
    Model.common_tx_src_for_save_dst(tx_srcs_save);
    Model.validateBudgets();
    Model.recalc();
    return Model;
}

function resizePerselyImages() {
    $(".perselyImg").each(function () {
        var context = this.getContext('2d');

        var percent = parseFloat($(this).attr("percent"));
        var imageObj = new Image();
        imageObj.onload = function () {
            context.clearRect(0, 0, this.width, this.height);

            context.globalAlpha = 0.5;
            context.drawImage(this, 0, 0, this.width, this.height, 0, 0, Model.PERSELY_IMG_W(), Model.PERSELY_IMG_H());

            var height = this.height * percent;
            var skipHeight = this.height - height;
            var sourceX = 0;
            var sourceY = skipHeight;
            var sourceWidth = this.width;
            var sourceHeight = height;
            var destWidth = Model.PERSELY_IMG_W();
            var destHeight = Model.PERSELY_IMG_H() * percent;
            var destX = 0;
            var destY = Model.PERSELY_IMG_H() - destHeight;

            context.globalAlpha = 1;
            context.drawImage(this, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
        };
        if ($(this).attr("src")) {
            imageObj.src = $(this).attr("src");
        } else {
            imageObj.src = 'http://4.bp.blogspot.com/_KlwA9ScOmP4/TLGiFcyALWI/AAAAAAAABVo/nsrmTIB-yEg/s1600/pt-piggy-bank-pink-22.jpg';
        }
    });
}
//# sourceMappingURL=budget.js.map
