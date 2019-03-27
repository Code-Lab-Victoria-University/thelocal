

export class Schema {
    static readonly EventsIntent = "EventsIntent"

    static readonly LocationSlot = "Location"
    static readonly VenueSlot = "Venue"
    static readonly DateSlot = "Date"
    static readonly TimeSlot = "Time"
    static readonly CategorySlot = "Category"

    static readonly SetIntents = {
        Venue: "SetVenueIntent",
        Date: "SetDateIntent",
        Category: "SetCategoryIntent",
        Location: "SetLocationIntent",
        Time: "SetTimeIntent"
    }

    static readonly SelectIntent = "SelectIntent"
    static readonly RESET = "RESET"
    
    static readonly NumberSlot = "Number"

    static readonly BookmarkEventIntent = "BookmarkEventIntent"
    static readonly ListBookmarksIntent = "ListBookmarksIntent"

    static readonly YesIntent = "AMAZON.YesIntent"
    static readonly NoIntent = "AMAZON.NoIntent"
    private constructor(){}
}