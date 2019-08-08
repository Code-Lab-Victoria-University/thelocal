

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

    static readonly DetailIntents = {
        Phone: "PhoneDetailIntent",
        Description: "DescriptionDetailIntent"
    }

    static readonly AMAZON = {
        PreviousIntent: "AMAZON.PreviousIntent",
        YesIntent: "AMAZON.YesIntent",
        StopIntent: "AMAZON.StopIntent",
        HelpIntent: "AMAZON.HelpIntent",
        CancelIntent: "AMAZON.CancelIntent"
    }

    static readonly PreviousPageIntent = "PreviousPageIntent"
    static readonly NextPageIntent = "NextPageIntent"

    static readonly SelectIntent = "SelectIntent"
    static readonly RESET = "RESET"
    static readonly SKIPTUTORIAL = "SKIPTUTORIAL"
    
    static readonly NumberSlot = "Number"

    static readonly TutorialIntent = "TutorialIntent"

    static readonly BookmarkEventIntent = "BookmarkEventIntent"
    static readonly ListBookmarksIntent = "ListBookmarksIntent"
    private constructor(){}
}