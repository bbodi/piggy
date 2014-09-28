interface Locale {
    monthNames: string[];
}

class LocaleGetter {

    static get(lang: string): Locale {
        if (lang == 'hu') {
            return new Locale_hu();
        }
    }

}

class Locale_hu implements Locale {
    monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
}