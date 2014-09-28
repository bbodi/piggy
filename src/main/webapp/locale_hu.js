var LocaleGetter = (function () {
    function LocaleGetter() {
    }
    LocaleGetter.get = function (lang) {
        if (lang == 'hu') {
            return new Locale_hu();
        }
    };
    return LocaleGetter;
})();

var Locale_hu = (function () {
    function Locale_hu() {
        this.monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
    }
    return Locale_hu;
})();
//# sourceMappingURL=locale_hu.js.map
