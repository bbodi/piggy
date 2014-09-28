/// <reference path="knockout.d.ts" />
/// <reference path="knockout.mapping.d.ts" />
/// <reference path="common.ts" />

class Item {
    text:KnockoutObservable<string>;
    completed:KnockoutObservable<boolean>;

    constructor(text:string) {
        this.text = ko.observable(text);
        this.completed = ko.observable(false);
    }
}

class TimePeriod {
    fromHour:KnockoutObservable<number>;
    fromMinute:KnockoutObservable<number>;
    duration:KnockoutObservable<number>;
    type:KnockoutObservable<string>;
    fromTimeStr:KnockoutComputed<string>;

    items:KnockoutObservableArray<Item>;
    itemToAdd:KnockoutObservable<string>;

    constructor(public dur, public periodType) {
        this.fromHour = ko.observable(0);
        this.fromMinute = ko.observable(0);
        this.duration = ko.observable(dur);
        this.type = ko.observable(periodType);
        this.items = ko.observableArray([]);
        this.itemToAdd = ko.observable("");
        this.fromTimeStr = ko.computed(function () {
            return this.fromHour() + ":" + this.fromMinute();
        }, this);
    }

    addItem() {
        this.items.push(new Item(this.itemToAdd()));
    }

    setFields(date:Date) {
        this.fromHour(date.getHours());
        this.fromMinute(date.getMinutes());
    }
}

class Config {
    timePeriods = ko.observableArray([]);
}

class Day {
    timePeriods:KnockoutObservableArray<TimePeriod>;

    constructor(config:Config) {
        var arr = [];
        config.timePeriods().forEach(function (period) {
            arr.push(period);
        });
        this.timePeriods = ko.observableArray(arr);
    }

    dayOfYear = ko.observable();

    setFields(date:Date) {
        var date = date;
        this.timePeriods().forEach(function (period) {
            period.setFields(date);
            date = new Date(date.getTime() + (period.duration() * 60 * 1000));
        });
    }
}

class Timer {
    today:KnockoutObservable<Day>;
    config:KnockoutObservable<Config>;
    selectedWeek:KnockoutObservable<number>;
    currentWeek:KnockoutObservable<number>;
    running:KnockoutObservable<boolean>;
    currentTimerPeriodIndex:KnockoutObservable<number>;
    startTime:KnockoutObservable<number>;
    elapsedSecs:KnockoutObservable<number>;

    activePeriod:KnockoutComputed<TimePeriod>;
    elapsedMinutes:KnockoutComputed<number>;
    weekNames:KnockoutComputed<string[]>;
    days:KnockoutComputed<Day[]>;
    remaindingSecs:KnockoutComputed<number>;
    currentPeriodTimerPercent:KnockoutComputed<string>;
    currentPeriodTimerPercentValue:KnockoutComputed<number>;

    constructor(config) {
        this.today = ko.observable(new Day(config));
        this.today().setFields(new Date());
        this.config = ko.observable(config);
        this.selectedWeek = ko.observable(0);
        this.currentWeek = ko.observable(30);
        this.running = ko.observable(false);
        this.currentTimerPeriodIndex = ko.observable(0);

        this.startTime = ko.observable(0);
        this.elapsedSecs = ko.observable(0);


        this.elapsedMinutes = ko.computed(function () {
            return Math.floor(this.elapsedSecs() / 60.0);
        }, this);

        this.weekNames = ko.computed(function () {
            return ["30", "31", "32", "33", "34"];
        }, this);

        this.days = ko.computed(function () {
            return [new Day(config), new Day(config), new Day(config)];
        }, this);

        this.activePeriod = ko.computed(function () {
            if (isNaN(this.currentTimerPeriodIndex())) {
                return null;
            }
            return this.today().timePeriods()[this.currentTimerPeriodIndex()];
        }, this);

        this.remaindingSecs = ko.computed(function () {
            if (this.activePeriod() == null) {
                return 0;
            }
            return Math.floor((this.activePeriod().duration() * 60 - this.elapsedSecs()));
        }, this);

        this.currentPeriodTimerPercentValue = ko.computed(function () {
            if (!this.activePeriod()) {
                return 0;
            }
            var maxSecs = this.activePeriod().duration() * 60;
            return (100 - (this.elapsedSecs() / maxSecs * 100));
        }, this);

        this.currentPeriodTimerPercent = ko.computed(function () {
            return this.currentPeriodTimerPercentValue() + "%";
        }, this);
    }


    clickPeriod(index:number) {
        this.currentTimerPeriodIndex(index);
        this.running(false);
    }

    onPeriodEnd() {
        this.running(false);
        if (this.currentTimerPeriodIndex() + 1 >= this.today().timePeriods().length) {
            alert("Gratulálok, vége! ;) ");
        } else {
            this.currentTimerPeriodIndex(this.currentTimerPeriodIndex() + 1);
            var nextPeriod = this.today().timePeriods()[this.currentTimerPeriodIndex()];
            alert("Indulhat a következő? " + nextPeriod.duration() + " perc " + nextPeriod.type());
            this.start();
        }
    }

    callback() {
        var elapsedSecs = (new Date().getTime() - this.startTime()) / 1000.0;
        this.elapsedSecs(elapsedSecs);
        document.title = this.remaindingSecs().toString();

        window.localStorage.setItem("elapsedSecs", this.elapsedSecs().toString());
        window.localStorage.setItem("running", this.running().toString());
        window.localStorage.setItem("currentTimerPeriodIndex", this.currentTimerPeriodIndex().toString());

        if (this.remaindingSecs() <= 0) {
            this.onPeriodEnd();
            return;
        }
        setTimeout(() => {
            if (this.running() == false) {
                return;
            }
            this.callback();
        }, 1000);
    }

    start() {
        this.elapsedSecs(0);
        this.running(true);
        var nowDate = new Date();
        var now = nowDate.getTime();
        this.startTime(now);
        this.activePeriod().setFields(nowDate);

        this.callback();
    }

    startFromLocalStorage() {
        var savedCurrentPeriodIndex = parseInt(window.localStorage.getItem("currentTimerPeriodIndex"));
        if (!isNaN(savedCurrentPeriodIndex)) {
            this.currentTimerPeriodIndex(savedCurrentPeriodIndex);
            var asd = window.localStorage.getItem("running");
            this.running(window.localStorage.getItem("running") == "true");
            this.elapsedSecs(parseInt(window.localStorage.getItem("elapsedSecs")));
            var now = new Date().getTime();
            this.startTime(now - this.elapsedSecs() * 1000);
            this.activePeriod().setFields(new Date(this.startTime()));
            this.callback();
        }
    }
}
// You have to extend knockout for your own handlers
interface KnockoutBindingHandlers {
    numericText: KnockoutBindingHandler;
    dateText: KnockoutBindingHandler;
    datePicker: KnockoutBindingHandler;
}

var Model;
function initView() {

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

    ko.bindingHandlers.dateText = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var date:Date = <Date>ko.utils.unwrapObservable(valueAccessor());
            var formattedValue = toDateStr(date);

            ko.bindingHandlers.text.update(element, function () {
                return formattedValue;
            }, null, null, null);
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
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();
            var asd = ko.utils.unwrapObservable(valueAccessor());
            element.value = value().toISOString();
        }

    };

    var config = new Config();
    config.timePeriods.push(new TimePeriod(20, "F"));
    config.timePeriods.push(new TimePeriod(120, "W"));
    config.timePeriods.push(new TimePeriod(20, "F"));
    config.timePeriods.push(new TimePeriod(90, "W"));
    config.timePeriods.push(new TimePeriod(20, "F"));
    config.timePeriods.push(new TimePeriod(90, "W"));
    config.timePeriods.push(new TimePeriod(120, "F"));

    Model = new Timer(config);
    ko.applyBindings(Model);

    Model.startFromLocalStorage();
}
