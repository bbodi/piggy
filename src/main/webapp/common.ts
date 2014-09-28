/// <reference path="jquery.d.ts" />

function numberWithCommas(x) {
    if (x == null) {
        return '0';
    }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function tx_tooltip(old_value:number, value:number):string {
    var new_value = old_value + value;
    var sign = " + ";
    if (value < 0) {
        value = Math.abs(value);
        sign = " - ";
    }
    return numberWithCommas(old_value) + sign + numberWithCommas(value) + " = " + numberWithCommas(new_value);
}

function pad(str:any, toLen:number, char:string) {
    if (!str) {
        return "";
    }
    if (typeof str != "string") {
        str = str.toString();
    }
    if (str.length < toLen) {
        for (var i = 0; i < toLen - str.length; ++i) {
            str = char + str;
        }
    }
    return str;

}

function toDateStr(date:Date) {
    return date.getFullYear() + '-' + (pad((date.getMonth() + 1).toString(), 2, '0')) + '-' + (pad((date.getDay() + 1).toString(), 2, '0'));
}

function null_or_empty(str:string): boolean {
    return str == null || str == "";
}

function to_date_str(year:number, month:number, day:number) {
    return year + '-' + (pad(month, 2, '0')) + '-' + (pad(day, 2, '0'));
}

function is_first_smaller_than_second(a:string, b:string):boolean {
    var a_year = a.split("-")[0];
    var a_month = a.split("-")[1];
    var a_day = a.split("-")[2];
    var b_year = b.split("-")[0];
    var b_month = b.split("-")[1];
    var b_day = b.split("-")[2];
    if (a_year < b_year) {
        return true;
    } else if (a_month < b_month) {
        return true;
    } else if (a_day < b_day) {
        return true;
    }
    return false;
}
