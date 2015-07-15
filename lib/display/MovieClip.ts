import Event = require("awayjs-core/lib/events/Event");
import ColorTransform = require("awayjs-core/lib/geom/ColorTransform");
import IAsset = require("awayjs-core/lib/library/IAsset");
import DisplayObjectContainer = require("awayjs-display/lib/containers/DisplayObjectContainer");
import DisplayObject = require("awayjs-display/lib/base/DisplayObject");
import Mesh = require("awayjs-display/lib/entities/Mesh");
import Billboard = require("awayjs-display/lib/entities/Billboard");
import AS2MovieClipAtapter = require("awayjs-player/lib/adapters/AS2MovieClipAdapter");

import MouseEvent = require("awayjs-display/lib/events/MouseEvent");
import SceneEvent = require("awayjs-display/lib/events/SceneEvent");

import MovieClipAdapter = require("awayjs-player/lib/adapters/MovieClipAdapter");
import MovieClipEvent = require("awayjs-player/lib/events/MovieClipEvent");
import Timeline = require("awayjs-player/lib/timeline/Timeline");
import AdaptedTextField = require("awayjs-player/lib/display/AdaptedTextField");
import ExecuteScriptCommand             = require("awayjs-player/lib/timeline/commands/ExecuteScriptCommand");

class MovieClip extends DisplayObjectContainer
{
    public static assetType:string = "[asset MovieClip]";

    private _timeline:Timeline;

    private _isButton:boolean;
    private _onMouseOver:Function;
    private _onMouseOut:Function;
    private _onMouseDown:Function;
    private _onMouseUp:Function;

    private _time:number;// the current time inside the animation
    private _currentFrameIndex:number;// the current frame
    private _constructedKeyFrameIndex:number;// the current index of the current active frame

    private _fps:number;// we use ms internally, but have fps, so user can set time by frame
    private _isPlaying:boolean;// false if paused or stopped
    private _loop:boolean = true;

    // not sure if needed
    private _prototype:MovieClip;
    private _enterFrame:MovieClipEvent;
    private _skipAdvance : boolean;
    private _isInit : boolean;

    private _adapter:MovieClipAdapter;

    private _potentialInstances:Array<DisplayObject>;
    private _keyFramesWaitingForPostConstruct:Array<ExecuteScriptCommand>;

    constructor()
    {
        super();
        this._prototype = this;
        this._potentialInstances = [];
        this._currentFrameIndex = -1;
        this._constructedKeyFrameIndex = -1;
        this._isInit=true;
        this._keyFramesWaitingForPostConstruct=[];
        this._isPlaying = true; // auto-play
        this._isButton=false;

        this._fps = 30;
        this._time = 0;
        this._enterFrame = new MovieClipEvent(MovieClipEvent.ENTER_FRAME, this);
        this.inheritColorTransform = true;
    }

    public get isInit():boolean
    {
        return this._isInit;
    }
    public set isInit(value:boolean)
    {
        this._isInit = value;
    }


    public get timeline():Timeline
    {
        return this._timeline;
    }
    public set timeline(value:Timeline)
    {
        this._timeline = value;
        var i:number=0;
        var potential_child_length:number=value.getPotentialChilds().length;
        for(i=0; i<potential_child_length; i++){
            this._potentialInstances[i]=null;
        }
    }
    public get loop()
    {
        return this._loop;
    }

    public set loop(value:boolean)
    {
        this._loop = value;
    }

    public get numFrames() : number
    {
        return this.timeline.numFrames();
    }

    public jumpToLabel(label:string) : void
    {
        // the timeline.jumpTolabel will set currentFrameIndex
        this.timeline.jumpToLabel(this, label);
    }

    public get currentFrameIndex() : number
    {
        return this._currentFrameIndex;
    }
    public get constructedKeyFrameIndex() : number
    {
        return this._constructedKeyFrameIndex;
    }

    public set constructedKeyFrameIndex(value : number)
    {
        this._constructedKeyFrameIndex = value;
    }

    public reset():void
    {
        //if(this.adapter && this.adapter.isBlockedByScript()){
        this._keyFramesWaitingForPostConstruct = [];
        this._isPlaying = true;
        this._time = 0;
        this._currentFrameIndex = -1;
        this._constructedKeyFrameIndex = -1;
        var i:number=this.numChildren;
        while (i--)
            this.removeChildAt(i);

        // force reset all potential childs on timeline.
        for (var key in this._potentialInstances) {
            if (this._potentialInstances[key]) {
                if (this._potentialInstances[key].isAsset(MovieClip))
                    (<MovieClip>this._potentialInstances[key]).reset();
            }
        }

        if(this.parent) {
            this._currentFrameIndex = 0;
            this.timeline.constructNextFrame(this);
            this._skipAdvance=true;
        }
//___scoped_this___.dennis.mov.Man.body.reach.gotoAndPlay("call");
        // i was thinking we might need to reset all children, but it makes stuff worse
        /*
        var i:number=this.numChildren;
        while (i--) {
            var child = this.getChildAt(i);
            if (child.isAsset(MovieClip))
                (<MovieClip>child).reset();
        }
        */
        //this.advanceChildren();

    }
    /*
    * Setting the currentFrameIndex will move the playhead for this movieclip to the new position
     */
    public set currentFrameIndex(value : number)
    {
        if(this._timeline) {
            value = Math.floor(value);
            if (value < 0)
                value = 0;
            else if (value >= this.timeline.numFrames())
                value = this.timeline.numFrames() - 1;

            this._skipAdvance = true;
            //this._time = 0;

            this.timeline.gotoFrame(this, value);

            this._currentFrameIndex = value;
        }
    }

    // adapter is used to provide MovieClip to scripts taken from different platforms
    // TODO: Perhaps adapters should be created dynamically whenever needed, rather than storing them
    public get adapter():MovieClipAdapter
    {
        return this._adapter;
    }

    // setter typically managed by factory
    public set adapter(value:MovieClipAdapter)
    {
        this._adapter = value;
    }
    public makeButton()
    {
        this._isButton=true;
        this.stop();
        this._onMouseOver = function() { this.currentFrameIndex = 1; };
        this._onMouseOut = function() { this.currentFrameIndex = 0; };
        this._onMouseDown = function() { this.currentFrameIndex = 2; };
        this._onMouseUp = function() { this.currentFrameIndex = this.currentFrameIndex == 0? 0 : 1; };

        this.addEventListener(MouseEvent.MOUSE_OVER, this._onMouseOver);
        this.addEventListener(MouseEvent.MOUSE_OUT, this._onMouseOut);
        this.addEventListener(MouseEvent.MOUSE_DOWN, this._onMouseDown);
        this.addEventListener(MouseEvent.MOUSE_UP, this._onMouseUp);
    }

    public removeButtonListener()
    {
        this.removeEventListener(MouseEvent.MOUSE_OVER, this._onMouseOver);
        this.removeEventListener(MouseEvent.MOUSE_OUT, this._onMouseOut);
        this.removeEventListener(MouseEvent.MOUSE_DOWN, this._onMouseDown);
        this.removeEventListener(MouseEvent.MOUSE_UP, this._onMouseUp);

    }

    public get name() : string
    {
        return this._pName;
    }

    public set name(value:string)
    {
        if (this._pName !== value) {
            this._pName = value;
            this.dispatchEvent(new MovieClipEvent(MovieClipEvent.NAME_CHANGED, this));
        }
    }

    public addChild(child:DisplayObject):DisplayObject
    {
        //if (child.name) console.log("adding child " + child.name + " at frame " + this._currentFrameIndex);
        child.inheritColorTransform = true;
        super.addChild(child);

        if(child.isAsset(MovieClip)){
            if((<MovieClip>child).timeline)
            {
                if ((<MovieClip>child).currentFrameIndex == -1) {
                    (<MovieClip>child).reset();
                }
            }
        }

        this.dispatchEvent(new MovieClipEvent(MovieClipEvent.CHILD_ADDED, child));

        return child;
    }


    public removeChild(child:DisplayObject):DisplayObject
    {
        super.removeChild(child);
        this.dispatchEvent(new MovieClipEvent(MovieClipEvent.CHILD_REMOVED, child));
        return child;
    }

    public get fps():number
    {
        return this._fps;
    }

    public set fps(newFps:number)
    {
        this._fps = newFps;
    }

    public get assetType():string
    {
        return MovieClip.assetType;
    }

    /**
     * Starts playback of animation from current position
     */
    public play()
    {
        this._isPlaying = true;
    }

    /**
     * should be called right before the call to away3d-render.
     */
    public update(timeDelta:number)
    {
        //this.logHierarchy();
        // TODO: Implement proper elastic racetrack logic
        var frameMarker:number = Math.floor(1000/this._fps);

        // right now, just advance frame once time marker has been reached (only allow for one frame advance per-update)
        this._time += Math.min(timeDelta, frameMarker);

        if (this._time >= frameMarker) {
            this._time = 0;
            this.advanceFrame();
            //console.log("update "+this._currentFrameIndex);
            //console.log("update key "+this._constructedKeyFrameIndex);

            this.dispatchEvent(this._enterFrame);
            var has_executed_script:boolean=true;
            while(has_executed_script)
                has_executed_script=this.executePostConstructCommands();

        }
    }

    public getPotentialChildInstance(id:number) : DisplayObject
    {
        if (!this._potentialInstances[id]) {
            this._potentialInstances[id] = this.timeline.getPotentialChildInstance(id);
        }

        return this._potentialInstances[id];
    }

    public addScriptForExecution(value:ExecuteScriptCommand)
    {
        this._keyFramesWaitingForPostConstruct.push(value);
    }
    public activateChild(id:number)
    {
        this.addChild(this.getPotentialChildInstance(id));
    }

    public deactivateChild(id:number)
    {
        this.removeChild(this._potentialInstances[id]);
    }

    /**
     * Stop playback of animation and hold current position
     */
    public stop()
    {
        this._isPlaying = false;
    }

    public clone() : DisplayObject
    {
        var clone:MovieClip = new MovieClip();
        var i;

        if (this._adapter) clone.adapter = this._adapter.clone(clone);
        clone._prototype = this._prototype;
        clone.timeline = this.timeline;

        clone._fps = this._fps;
        clone._loop = this._loop;
        clone.name = this.name;
        clone.mouseEnabled = this.mouseEnabled;
        clone.mouseChildren = this.mouseChildren;

        clone._iMaskID = this._iMaskID;
        clone._iMasks = this._iMasks? this._iMasks.concat() : null;
        if (this.transform.matrix)
            clone.transform.matrix = this.transform.matrix.clone();

        clone.transform.matrix3D = this.transform.matrix3D;

        var ct = this.transform.colorTransform;
        if (ct) clone.transform.colorTransform = new ColorTransform(ct.redMultiplier, ct.greenMultiplier, ct.blueMultiplier, ct.alphaMultiplier, ct.redOffset, ct.greenOffset, ct.blueOffset, ct.alphaOffset);

        return clone;
    }


    public advanceFrame(skipChildren:boolean = false)
    {
        if(this.timeline) {
            var i;
            var oldFrameIndex = this._currentFrameIndex;
            var advance = (this._isPlaying && !this._skipAdvance) || oldFrameIndex == -1;
            if (advance && oldFrameIndex == this.timeline.numFrames() - 1 && !this._loop) {
                advance = false;
            }
            if (advance && oldFrameIndex == 0 && this.timeline.numFrames() == 1) {
                //console.log("one frame clip");
                this._currentFrameIndex = 0;
                advance = false;
            }
            if (advance) {
                //console.log("advance");
                ++this._currentFrameIndex;
                if (this._currentFrameIndex == this.timeline.numFrames()) {
                    // looping - jump to first frame.
                    this.currentFrameIndex=0;
                }
                else if (oldFrameIndex != this._currentFrameIndex){
                    // not looping - construct next frame
                    this.timeline.constructNextFrame(this);
                }
            }

            if (!skipChildren)
                this.advanceChildren();

        }
        this._skipAdvance = false;
    }

    private advanceChildren()
    {
        var len = this.numChildren;
        for (var i = 0; i <  len; ++i) {
            var child = this.getChildAt(i);
            if (child instanceof MovieClip)
                (<MovieClip>child).advanceFrame();
        }
    }




// DEBUG CODE:
    logHierarchy(depth: number = 0):void
    {
        this.printHierarchyName(depth, this);

        var len = this.numChildren;
        for (var i = 0; i < len; i++) {
            var child = this.getChildAt(i);

            if (child instanceof MovieClip)
                (<MovieClip>child).logHierarchy(depth + 1);
            else
                this.printHierarchyName(depth + 1, child);
        }
    }

    printHierarchyName(depth:number, target:DisplayObject)
    {
        var str = "";
        for (var i = 0; i < depth; ++i)
            str += "--";

        str += " " + target.name + " = " + target._iMaskID;
        console.log(str);
    }

    executePostConstructCommands():boolean
    {

        // a script ,might call gotoAndStop() / gotoAndPlay() on itself or on other mc
        // this might result in more script that should be executed.
        // each mc provides a list of index to script that needs postconstructing.
        // in this function, we postcontruct all those scripts
        var has_script_executed:boolean=false;
        if(this.timeline) {
            if(this._keyFramesWaitingForPostConstruct.length>0){
                has_script_executed=true;
                this._keyFramesWaitingForPostConstruct[0].execute(this);
                this._keyFramesWaitingForPostConstruct.shift();
            }
        }

        var i;
        var len:number = this.numChildren-1;
        for (i = len; i >=0; --i) {
            var child = this.getChildAt(i);
            if (child.isAsset(MovieClip)) {
                if ((<MovieClip>child).executePostConstructCommands()) {
                    has_script_executed = true;
                }
            }
        }
        return has_script_executed;
    }
}
export = MovieClip;
