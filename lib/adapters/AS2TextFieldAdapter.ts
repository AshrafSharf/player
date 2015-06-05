import TextFieldAdapter = require("awayjs-player/lib/adapters/TextFieldAdapter");
import AdaptedTextField = require("awayjs-player/lib/display/AdaptedTextField");

class AS2TextFieldAdapter implements TextFieldAdapter
{
    private _adaptee:AdaptedTextField;
    private _embedFonts : boolean;

    constructor(adaptee : AdaptedTextField)
    {
        // create an empty text field if none is passed
        this._adaptee = adaptee || new AdaptedTextField();
    }

    get adaptee() : AdaptedTextField
    {
        return this._adaptee;
    }

    clone(newAdaptee:AdaptedTextField):TextFieldAdapter
    {
        return new AS2TextFieldAdapter(newAdaptee);
    }

    get embedFonts() : boolean
    {
        return this._embedFonts;
    }

    set embedFonts(value:boolean)
    {
        this._embedFonts = value;
    }

    get text():string
    {
        return this._adaptee.text;
    }

    set text(value:string)
    {
        this._adaptee.text = value;
    }
}
export = AS2TextFieldAdapter;