var Persely = function () {
    this.place = ko.observable("otp");
    this.name = ko.observable('Persely');
    this.currentValue = ko.observable(Math.floor(Math.random() * 500000));
    this.goal_value = ko.observable(this.currentValue() + Math.floor(Math.random() * 500000));
    this.currentValuePercent = ko.computed(function () {
        return this.currentValue() / this.goal_value();
    }, this);
    this.editing = ko.observable(false);

    this.edit = function () {
        var oldEditState = this.editing();
        var openEditor = oldEditState == false;
        if (openEditor) {
            this.openEditor();
        }
        this.editing(!oldEditState);
    };

    this.editingBackend = {
        name: ko.observable(),
        goal_value: ko.observable(),
        place: ko.observable()
    };

    this.openEditor = function () {
        this.editingBackend.name(this.name());
        this.editingBackend.goal_value(this.goal_value());
        this.editingBackend.place(this.place());
    };

    this.save = function () {
        this.name(this.editingBackend.name());
        this.goal_value(this.editingBackend.goal_value());
        this.place(this.editingBackend.place());
        if (Model.hasPlace(this.place()) == false) {
            Model.places.push(new Place(this.place()));
        }
        this.editing(false);
        resizePerselyImages();
    }

};
/*
 var PlanningType =function() {
 this.Expense = {};
 this.Flagging = {};
 this.IgnoreInBudgetFlagging = {};
 } */

var BudgetEntry = function (budgeted) {
        this.budgeted_to = ko.observable('asd');
        this.budgeted = ko.observable(budgeted);
        this.spent = ko.observable(Math.floor(Math.random() * 50000));
        this.planningType = ko.observable();
        this.balance = ko.computed(function () {
                if (this.planningType() === "PlanningType.Save") {
                    return this.spent();
                } else {
                    return this.budgeted() - this.spent();
                }
            }, this);
        this.editing = ko.observable(false);

        this.editingBackend = {
            category: ko.observable(),
            budgeted: ko.observable()
        };

        this.beginEditing = function () {
            this.editingBackend.category(this.budgeted_to());
            this.editingBackend.budgeted(this.budgeted());
            this.editing(true);
        };

        this.commitEditing = function () {
            this.budgeted_to(this.editingBackend.category());
            this.budgeted(this.editingBackend.budgeted());
            this.editing(false);
        };

        this.rollbackEditing = function () {
            this.editing(false);
        };


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

    }
    ;

var Budget = function (budgetEntries, year, month) {
    this.budgetEntries = ko.observableArray(budgetEntries);
    this.year = ko.observable(year);
    this.month = ko.observable(month);

    this.isNewRowVisible = ko.observable(false);
    this.newBudgetEntry = ko.observable(new BudgetEntry());

    this.saveNewBudgetEntry = function () {
        var newEntry = this.newBudgetEntry();
        newEntry.commitEditing();
        this.budgetEntries.push(newEntry);
        this.newBudgetEntry(new BudgetEntry());
        this.isNewRowVisible(false);
    };

    this.toggleNewRowVisibility = function () {
        var newVisibility = !this.isNewRowVisible();
        this.isNewRowVisible(newVisibility);
        if (newVisibility) {
            this.newBudgetEntry().beginEditing();
        }
    }
};

var Place = function (name) {
    this.name = ko.observable(name);
    this.sumValue = ko.observable(0);
    this.myValue = ko.observable(0);
};

var TransactionType = function () {
    this.Spending = {};
    this.Save = {};
};

var Transaction = function () {
    this.src = ko.observable();
    this.dst = ko.observable();
    this.type = ko.observable();
    this.value = ko.observable();
    this.year = ko.observable();
    this.month = ko.observable();
    this.day = ko.observable();

    this.dateStr = ko.computed(function () {
        return this.year() + "-" + pad(this.month(), 2, '0') + "-" + pad(this.day(), 2, '0');
    }, this);

    this.editing = ko.observable(false);

    this.editingBackend = {
        src: ko.observable(),
        dst: ko.observable(),
        type: ko.observable(),
        dateStr: ko.observable(),
        value: ko.observable(),
    };

    this.beginEditing = function () {
        this.editingBackend.src(this.src());
        this.editingBackend.dst(this.dst());
        this.editingBackend.type(this.type());
        this.editingBackend.dateStr(this.dateStr());
        this.editingBackend.value(this.value());

        this.editing(true);
    };

    this.commitEditing = function () {
        this.src(this.editingBackend.src());
        this.dst(this.editingBackend.dst());
        this.type(this.editingBackend.type());
        var dateParts = this.editingBackend.dateStr().split("-");
        this.year(dateParts[0]);
        this.month(dateParts[1]);
        this.day(dateParts[2]);
        this.value(this.editingBackend.value());

        this.editing(false);
    };

    this.rollbackEditing = function () {
        this.editing(false);
    }
};

var PiggyModel = function (perselyek, budgets, transactions, lang) {
    this.PERSELY_IMG_W = ko.observable(100);
    this.PERSELY_IMG_H = ko.observable(100);

    this.newPersely = ko.observable(new Persely());
    this.editing_transactions = ko.observableArray([]);

    this.perselyek = ko.observableArray(perselyek);
    var validateBudgets = function () {
        budgets.forEach(function (budget) {
            var sameMonthAndYearBudgets = budgets.filter(function (other) {
                return other.month() == budget.month() && other.year() == budget.year();
            });
            if (sameMonthAndYearBudgets.length != 1) {
                alert("Több Budget rendelkezik ugyanazzal az évvel és hónappal! " + budget.year() + "." + budget.month());
            }
        });
    }();
    this.budgets = ko.observableArray(budgets);
    this.transactions = ko.observableArray(transactions);
    this.lang = ko.observable(Locale.get(lang));
    this.budgetMonthCount = ko.observable(3);

    this.monthNames = ko.observableArray(this.lang().monthNames);
    this.places = ko.observableArray([new Place("otp"), new Place("kp"), new Place("fundamenta")]);

    this.hasPlace = function (placeName) {
        for (var i = 0; i < this.places().length; ++i) {
            if (this.places()[i].name() === placeName) {
                return true;
            }
        }
        return false;
    };

    this.selectedBudgetYear = ko.observable(new Date().getYear() + 1900);
    this.selectedBudgetMonth = ko.observable(new Date().getMonth());
    this.currentBudgetMonthNullBasedIndex = ko.observable(new Date().getMonth());

    this.budgetMonths = ko.computed(function () {
        var retarr = [];
        var from = this.selectedBudgetMonth();
        var max = Math.min(from + this.budgetMonthCount(), 12);
        if (max - from < this.budgetMonthCount()) {
            from -= this.budgetMonthCount() - (max - from);
        }
        for (var k = from; k < max; k++) {
            retarr.push(this.budgets()[k]);
        }
        return retarr;
    }, this);

    this.budgetMonthsRows = ko.computed(function () {
        var budgetMonths = this.budgetMonths();
        var itemsPerRow = 3;
        var rows = [];
        var rowIndex = 0;
        for (var i = 0; i < budgetMonths.length; ++i) {
            if (!rows[rowIndex]) {
                rows.push([]);
            }
            rows[rowIndex].push(budgetMonths[i]);
            if (rows[rowIndex].length == itemsPerRow) {
                rowIndex++;
            }
        }
        return rows;
    }, this);

    this.selectBudgetMonthCount = function (newValue) {
        this.budgetMonthCount(newValue);
    };

    this.selectBudgetMonth = function (newValue) {
        this.selectedBudgetMonth(newValue);
    };

    this.selectBudgetYear = function (newValue) {
        this.selectedBudgetYear(newValue);
    };

    this.saveNewPersely = function () {
        this.newPersely().save();
        this.perselyek.push(this.newPersely());
        this.newPersely(new Persely());
        resizePerselyImages();
    };

    var self = this;
    PiggyModel.openTransactions = function () {
        var budget = this;
        self.editing_transactions([]);
        var budgetYear = budget.year();
        var budgetmonth = budget.month();
        for (var i = 0; i < self.transactions().length; ++i) {
            var tx = self.transactions()[i];
            var txYear = tx.year();
            var txMonth = tx.month();
            if (budgetYear == txYear && budgetmonth == txMonth) {
                self.editing_transactions.push(tx);
            }
        }
        $('#transactionsModal').modal('show');
    };

    PiggyModel.saveTransactions = function () {
        $('#transactionsModal').modal('hide');
    };

    this.deleteTransaction = function () {
        self.editing_transactions.remove(this);
    };

    PiggyModel.addNewTransaction = function () {
        var tx = new Transaction();
        tx.src("");
        tx.dst("");
        tx.type("");
        var today = new Date();
        tx.year(today.getYear() + 1900);
        tx.month(today.getMonth()+1);
        tx.day(today.getDay()+1);
        tx.value(0);
        self.editing_transactions.push(tx);
        self.transactions.push(tx);
        tx.beginEditing();
    };

    this.getBudgetEntry = function (budgetEntries, tx) {
        var arr = budgetEntries.filter(function (entry) {
            var sameSource = entry.budgeted_to() == tx.dst();
            var saving = tx.type() == "TransactionType.Flagging" && entry.planningType() == "PlanningType.Save";
            var spending = tx.type() == "TransactionType.Spending" && entry.planningType() == "PlanningType.Expense";
            return sameSource && (saving || spending);
        });
        if (arr.length == 1) {
            return arr[0];
        } else if (arr.length > 1) {
            alert("Több BudgetEntry találat van ehhez: (dst, type) = (" + tx.dst() + ", " + tx.type() + ")");
        }
        return null;
    };

    this.getPersely = function (perselyName) {
        var arr = this.perselyek().filter(function (persely) {
            return persely.name() === perselyName;
        });
        return arr ? arr[0] : null;
    };

    this.getBudget = function (year, month) {
        var arr = this.budgets().filter(function (budget) {
            return budget.year() === year && budget.month() == month
        });
        return arr ? arr[0] : null;
    };

    this.decreaseSrcPerselyIfExists = function (perselyName, tx) {
        if (!perselyName) {
            return;
        }
        var srcPersely = this.getPersely(perselyName);
        srcPersely.currentValue(srcPersely.currentValue() - tx.value());
    };

    this.increaseDstPersely = function (perselyName, tx) {
        var srcPersely = this.getPersely(perselyName);
        srcPersely.currentValue(srcPersely.currentValue() + tx.value());
    };

    this.recalc = function () {
        this.perselyek().forEach(function (persely) {
            persely.sumValue(0);
        });

        this.budgets().forEach(function (budget) {
            budget.budgetEntries().forEach(function (budgetEntry) {
                budgetEntry.spent(0);
            });
        });


        this.transactions().forEach(function (tx) {
            var src = tx.src();
            var dst = tx.dst();
            if (tx.type() === "TransactionType.Spending") {
                self.decreaseSrcPerselyIfExists(src, tx);
                var budget = self.getBudget(tx.year(), tx.month());
                var entry = self.getBudgetEntry(budget.budgetEntries(), tx);
                if (entry != null) {
                    entry.spent(entry.spent() + tx.value());
                }
            } else if (tx.type() === "TransactionType.IgnoreInBudgetFlagging" || tx.type() === "TransactionType.Flagging") {
                self.decreaseSrcPerselyIfExists(src, tx);
                self.increaseDstPersely(dst, tx);
                if (tx.type() === "TransactionType.Flagging") {
                    var budget = self.getBudget(tx.year(), tx.month());
                    if (!budget) {
                        debugger;
                    }
                    var entry = self.getBudgetEntry(budget.budgetEntries(), tx);
                    if (entry != null) {
                        entry.spent(entry.spent() + tx.value());
                    }
                }
            }
        });
    }


};

var Model;
function initView() {
    var perselyek = [];

    for (var i = 0; i < 6; i++) {
        perselyek.push(new Persely());
    }
    var budgets = [];
    for (var k = 0; k < 12; k++) {
        var entries = [];
        var entryCount = Math.floor(Math.random() * 10);
        for (var i = 0; i < entryCount; i++) {
            entries.push(new BudgetEntry(Math.floor(Math.random() * 50000)));
        }
        budgets.push(new Budget(entries, 2014, k));
    }
    var transactions = [];
    for (var k = 0; k < 30; k++) {
        var year = 2014;
        var month = 6 + Math.floor(Math.random() * 4) + 1;
        var day = Math.floor(Math.random() * 30) + 1;
        var tx = new Transaction();
        tx.src("otp");
        tx.dst("Ruha");
        tx.type("Spending");
        tx.year(year);
        tx.month(month);
        tx.day(day);
        tx.value(Math.floor(Math.random() * 30000));
        transactions.push(tx);
    }


    ko.bindingHandlers.numericText = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var formattedValue = numberWithCommas(value);

            ko.bindingHandlers.text.update(element, function () {
                return formattedValue;
            });
        },
        defaultPrecision: 1
    };

    ko.bindingHandlers.dateText = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var date = ko.utils.unwrapObservable(valueAccessor());
            var formattedValue = toDateStr(date);

            ko.bindingHandlers.text.update(element, function () {
                return formattedValue;
            });
        },
        defaultPrecision: 1
    };

    ko.bindingHandlers.datePicker = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            ko.utils.registerEventHandler(element, "change", function () {
                var value = valueAccessor();
                value(new Date(element.value));
            });
        },
        // Update the control whenever the view model changes
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();
            var asd = ko.utils.unwrapObservable(valueAccessor());
            element.value = value().toISOString();
        }

    };

    Model = new PiggyModel(perselyek, budgets, transactions, "hu");
    ko.applyBindings(Model);

    resizePerselyImages();
}

function resizePerselyImages() {
    $(".perselyImg").each(function() {
        var context = this.getContext('2d');

        var percent = $(this).attr("percent");
        var imageObj = new Image();
        imageObj.onload = function() {
            context.clearRect(0, 0, this.width, this.height);

            context.globalAlpha = 0.5;
            context.drawImage(this, 0, 0, this.width,
                this.height, 0, 0, Model.PERSELY_IMG_W(), Model.PERSELY_IMG_H());

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
            context.drawImage(this, sourceX, sourceY, sourceWidth,
                sourceHeight, destX, destY, destWidth, destHeight);

        };
        imageObj.src = $(this).attr("src");
    });
}