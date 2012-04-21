var SelectorType = {
	None : 0,
	Variable : 1,
	Method : 2
};

/** Contains selector IDs for a few selected selectors */
var SelectorCache = {
	// Statically defined selectors, (almost the) same in all SCI versions
	_info_ : 0,	///< Removed in SCI3
	y : 0,
	x : 0,
	view : 0, loop : 0, cel : 0, ///< Description of a specific image
	underBits : 0, ///< Used by the graphics subroutines to store backupped BG pic data
	nsTop : 0, nsLeft : 0, nsBottom : 0, nsRight : 0, ///< View boundaries ('now seen')
	lsTop : 0, lsLeft : 0, lsBottom : 0, lsRight : 0, ///< Used by Animate() subfunctions and scroll list controls
	signal : 0, ///< Used by Animate() to control a view's behavior
	illegalBits : 0, ///< Used by CanBeHere
	brTop : 0, brLeft : 0, brBottom : 0, brRight : 0, ///< Bounding Rectangle
	// name, key, time
	text : 0, ///< Used by controls
	elements : 0, ///< Used by SetSynonyms()
	// color, back
	mode : 0, ///< Used by text controls (-> DrawControl())
	// style
	state : 0, font : 0, type : 0,///< Used by controls
	// window
	cursor : 0, ///< Used by EditControl
	max : 0, ///< Used by EditControl, removed in SCI3
	mark : 0, //< Used by list controls (script internal, is needed by us for the QfG import rooms)
	sort : 0, //< Used by list controls (script internal, is needed by us for QfG3 import room)
	// who
	message : 0, ///< Used by GetEvent
	// edit
	play : 42, ///< Play function (first function to be called)
	number : 0,
	handle : 0,	///< Replaced by nodePtr in SCI1+
	nodePtr : 0,	///< Replaces handle in SCI1+
	client : 0, ///< The object that wants to be moved
	dx : 0, dy : 0, ///< Deltas
	b_movCnt : 0, b_i1 : 0, b_i2 : 0, b_di : 0, b_xAxis : 0, b_incr : 0, ///< Various Bresenham vars
	xStep : 0, yStep : 0, ///< BR adjustments
	xLast : 0, yLast : 0, ///< BR last position of client
	moveSpeed : 0, ///< Used for DoBresen
	canBeHere : 0, ///< Funcselector: Checks for movement validity in SCI0
	heading : 0, mover : 0, ///< Used in DoAvoider
	doit : 0, ///< Called (!) by the Animate() system call
	isBlocked : 0, looper : 0,	///< Used in DoAvoider
	priority : 0,
	modifiers : 0, ///< Used by GetEvent
	replay : 0, ///< Replay function
	// setPri, at, next, done, width
	wordFail : 0, syntaxFail : 0, ///< Used by Parse()
	// semanticFail, pragmaFail
	// said
	claimed : 0, ///< Used generally by the event mechanism
	// value, save, restore, title, button, icon, draw
	delete_ : 0, ///< Called by Animate() to dispose a view object
	z : 0,

	// SCI1+ static selectors
	parseLang : 0,
	printLang : 0, ///< Used for i18n
	subtitleLang : 0,
	size : 0,
	points : 0, ///< Used by AvoidPath()
	palette : 0,	///< Used by the SCI0-SCI1.1 animate code, unused in SCI2-SCI2.1, removed in SCI3
	dataInc : 0,	///< Used to sync music with animations, removed in SCI3
	// handle (in SCI1)
	min : 0, ///< SMPTE time format
	sec : 0,
	frame : 0,
	vol : 0,
	pri : 0,
	// perform
	moveDone : 0,	///< used for DoBresen

	// SCI1 selectors which have been moved a bit in SCI1.1, but otherwise static
	cantBeHere : 0, ///< Checks for movement avoidance in SCI1+. Replaces canBeHere
	topString : 0, ///< SCI1 scroll lists use this instead of lsTop. Removed in SCI3
	flags : 0,

	// SCI1+ audio sync related selectors, not static. They're used for lip syncing in
	// CD talkie games
	syncCue : 0, ///< Used by DoSync()
	syncTime : 0,

	// SCI1.1 specific selectors
	scaleSignal : 0, //< Used by kAnimate() for cel scaling (SCI1.1+)
	scaleX : 0, scaleY : 0,	///< SCI1.1 view scaling
	maxScale : 0,		///< SCI1.1 view scaling, limit for cel, when using global scaling
	vanishingX : 0,	///< SCI1.1 view scaling, used by global scaling
	vanishingY : 0,	///< SCI1.1 view scaling, used by global scaling

	// Used for auto detection purposes
	overlay : 0,	///< Used to determine if a game is using old gfx functions or not

	// SCI1.1 Mac icon bar selectors
	iconIndex : 0, ///< Used to index icon bar objects
	select : 0,
};

var selectorNames = [];

function findSelector(name) {
    for(var x in selectorNames) {
        if(selectorNames[x] == name)
            return parseInt(x);
    }
    
    return -1;
}

function mapSelector(internalName, defaultName) {
    if(typeof defaultName == 'undefined') {
        defaultName = internalName;
    }
    
    if(typeof SelectorCache[internalName] == 'undefined') {
        Debug.warn("Selector was not defined: " + internalName);
    }
    
    var selectorId = findSelector(defaultName);
    if(selectorId == -1) {
        //Debug.error("Failed to map selector " + internalName);
    }
    
    Debug.log("Selector", "Mapping selector " + internalName + " to id " + selectorId);
    
    SelectorCache[internalName] = selectorId;
}

function mapSelectors() {
	mapSelector("_info_", "-info-");
	mapSelector("y");
	mapSelector("x");
	mapSelector("view");
	mapSelector("loop");
	mapSelector("cel");
	mapSelector("underBits");
	mapSelector("nsTop");
	mapSelector("nsLeft");
	mapSelector("nsBottom");
	mapSelector("lsTop");
	mapSelector("lsLeft");
	mapSelector("lsBottom");
	mapSelector("lsRight");
	mapSelector("nsRight");
	mapSelector("signal");
	mapSelector("illegalBits");
	mapSelector("brTop");
	mapSelector("brLeft");
	mapSelector("brBottom");
	mapSelector("brRight");
	// name
	// key
	// time
	mapSelector("text");
	mapSelector("elements");
	// color
	// back
	mapSelector("mode");
	// style
	mapSelector("state");
	mapSelector("font");
	mapSelector("type");
	// window
	mapSelector("cursor");
	mapSelector("max");
	mapSelector("mark");
	mapSelector("sort");
	// who
	mapSelector("message");
	// edit
	mapSelector("play");
	mapSelector("number");
	mapSelector("handle");	// nodePtr
	mapSelector("client");
	mapSelector("dx");
	mapSelector("dy");
	mapSelector("b_movCnt", "b-moveCnt");
	mapSelector("b_i1", "b-i1");
	mapSelector("b_i2", "b-i2");
	mapSelector("b_di", "b-di");
	mapSelector("b_xAxis", "b-xAxis");
	mapSelector("b_incr", "b-incr");
	mapSelector("xStep");
	mapSelector("yStep");
	mapSelector("xLast");
	mapSelector("yLast");
	mapSelector("moveSpeed");
	mapSelector("canBeHere");	// cantBeHere
	mapSelector("heading");
	mapSelector("mover");
	mapSelector("doit");
	mapSelector("isBlocked");
	mapSelector("looper");
	mapSelector("priority");
	mapSelector("modifiers");
	mapSelector("replay");
	// setPri
	// at
	// next
	// done
	// width
	mapSelector("wordFail");
	mapSelector("syntaxFail");
	// semanticFail
	// pragmaFail
	// said
	mapSelector("claimed");
	// value
	// save
	// restore
	// title
	// button
	// icon
	// draw
	mapSelector("delete_", "delete");
	mapSelector("z");
	// -----------------------------
	mapSelector("size");
	mapSelector("moveDone");
	mapSelector("vol");
	mapSelector("pri");
	mapSelector("min");
	mapSelector("sec");
	mapSelector("frame");
	mapSelector("dataInc");
	mapSelector("palette");
	mapSelector("cantBeHere");
	mapSelector("nodePtr");
	mapSelector("flags");
	mapSelector("points");
	mapSelector("syncCue");
	mapSelector("syncTime");
	mapSelector("printLang");
	mapSelector("subtitleLang");
	mapSelector("parseLang");
	mapSelector("overlay");
	mapSelector("topString");
	mapSelector("scaleSignal");
	mapSelector("scaleX");
	mapSelector("scaleY");
	mapSelector("maxScale");
	mapSelector("vanishingX");
	mapSelector("vanishingY");
	mapSelector("iconIndex");
	mapSelector("select");
}

function loadSelectorNames() {
    ResourceManager.loadResource("vocab." + VocabResource.SELECTORS + ".b64", function(selectorData) {
        // Temporary hack!
        selectorData.data = selectorData.data.slice(2);

    	var oldScriptHeader = (getSciVersion() == SciVersion.SCI_VERSION_0_EARLY);
    	
    	var count = selectorData.getUint16LE(0) + 1;

        selectorNames = [];
    	
    	for(var i = 0; i<count; i++) {
    	    var offset = selectorData.getUint16LE(2 + i * 2);
    	    var len = selectorData.getUint16LE(offset);
    	    
    	    var str = "";
    	    for(var n = 0; n<len; n++) {
    	        str = str + String.fromCharCode(selectorData.getByte(offset + 2 + n));
    	    }
    	    
    	    selectorNames.push(str);
    	    
            // Early SCI versions used the LSB in the selector ID as a read/write
            // toggle. To compensate for that, we add every selector name twice.
    	    if(oldScriptHeader)
    	        selectorNames.push(str);
    	}
    	
    	mapSelectors();
    	
//        selectorData.hexdump();
    });
}

function readSelectorValueSigned(object, selectorId) {
    return readSelector(object, selectorId).toSint16();
}
function readSelectorValue(object, selectorId) {
    return readSelector(object, selectorId).offset;
}
function readSelector(object, selectorId) {
	var address = new ObjVarRef();

	if (lookupSelector(object, selectorId, address, null) != SelectorType.Variable)
		return new Reg(0, 0);
	else
		return address.getPointer().clone();
}

function writeSelectorValue(object, selectorId, value) {
    return writeSelector(object, selectorId, new Reg(0, value));
}
function writeSelector(object, selectorId, value) {
	var address = new ObjVarRef();

	if ((selectorId < 0) || (selectorId > selectorNames.length)) {
		Debug.error("Attempt to write to invalid selector " + selectId + " of object at " + object);
		return;
	}

	if (lookupSelector(object, selectorId, address, null) != SelectorType.Variable)
 		Debug.error("Selector '" + getSelectorName(selectorId) + "' of object at " + object + "could not be written to");
	else {
		address.getPointer().set(value);
    }
}

function invokeSelector(object, selectorId, k_argc, k_argp, args) {
	var i;
	var framesize = 2 + 1 * args.length;
	var slc_type;
	var stackframe = k_argp + k_argc;

    VM.state.stack[stackframe] = new Reg(0, selectorId);    // The selector we want to call
    VM.state.stack[stackframe + 1] = new Reg(0, args.length);  // Argument count
    
	slc_type = lookupSelector(object, selectorId, null, null);

	if (slc_type == SelectorType.None) {
		Debug.error("Selector " + getSelectorName(selectorId) + " of object at " + object + " could not be invoked");
	}
	if (slc_type == SelectorType.Variable) {
		Debug.error("Attempting to invoke variable selector " + getSelectorName(selectorId) + " of object " + object);
	}

	for (var i = 0; i < args.length; i++)
		VM.state.stack[stackframe + 2 + i].set(args[i]); // Write each argument

	// Now commit the actual function:
	var xstack = sendSelector(object, object, stackframe, framesize, stackframe);

	xstack.sp += args.length + 2;
	xstack.fp += args.length + 2;

	VM.run(); // Start a new vm
}


function lookupSelector(obj_location, selectorId, varp, fptr) {
	var obj = SegManager.getObject(obj_location);
	var index;
    var oldScriptHeader = (getSciVersion() == SciVersion.SCI_VERSION_0_EARLY);

	// Early SCI versions used the LSB in the selector ID as a read/write
	// toggle, meaning that we must remove it for selector lookup.
	if (oldScriptHeader)
		selectorId &= ~1;

	if (obj == null) {
		Debug.error("lookupSelector(): Attempt to send to non-object or invalid script. Address was " + obj_location);
	}

	index = obj.locateVarSelector(selectorId);

	if (index >= 0) {
		// Found it as a variable
		if (varp != null) {
			varp.obj = obj_location;
			varp.varIndex = index;
		}
		return SelectorType.Variable;
	} else {
		// Check if it's a method, with recursive lookup in superclasses
		while (obj != null) {
			index = obj.funcSelectorPosition(selectorId);
			if (index >= 0) {
				if (fptr != null)
					fptr.set(obj.getFunction(index));

				return SelectorType.Method;
			} else {
				obj = SegManager.getObject(obj.getSuperClassSelector());
			}
		}

        // Debug
        obj = SegManager.getObject(obj_location);
    	index = obj.locateVarSelector(selectorId);
    	//
    	
		return SelectorType.None;
	}
}

var CALL_SP_CARRY = 0xFFFF;

function sendSelector(send_obj, work_obj, sp, framesize, argp) {
	// send_obj and work_obj are equal for anything but 'super'
	// Returns a pointer to the TOS exec_stack element
	var funcp = new Reg(0, 0);
	var selector;
	var argc;
	var origin = VM.state.executionStack.length - 1; // Origin: Used for debugging
    var varp = new ObjVarRef();

    var prevElementIterator = VM.state.executionStack.length;

	while (framesize > 0) {
		selector = VM.state.stack[argp].requireUint16();
		argp++;
		argc = VM.state.stack[argp].requireUint16();

		if (argc > 0x800)	// More arguments than the stack could possibly accomodate for
			Debug.error("sendSelector(): More than 0x800 arguments to function call");

		var selectorType = lookupSelector(send_obj, selector, varp, funcp);
		if (selectorType == SelectorType.None)
			Debug.error("Send to invalid selector " + (0xffff & selector) + " of object at " + send_obj);

		var stackType = ExecStackType.EXEC_STACK_TYPE_VARSELECTOR;
		var curSP = 0;
		var curFP = new Reg(0, 0); //NULL_REG
		
		if (selectorType == SelectorType.Method) {
			stackType = ExecStackType.EXEC_STACK_TYPE_CALL;
			curSP = sp;
			curFP = funcp;
			sp = CALL_SP_CARRY; // Destroy sp, as it will be carried over
		}

		var xstack = new ExecStack(work_obj, send_obj, curSP, argc, argp,
							0xFFFF, curFP, selector, -1, -1,
							origin, stackType);

		if (selectorType == SelectorType.Variable) {
			xstack.varp = varp.clone();
			xstack.pc = varp.obj;
		}

		// The new stack entries should be put on the stack in reverse order
		// so that the first one is executed first
		VM.state.executionStack.splice(prevElementIterator, 0, xstack);
		// Decrement the stack end pointer so that it points to our recently
		// added element, so that the next insert() places it before this one.
		//--prevElementIterator;

		framesize -= (2 + argc);
		argp += argc + 1;
	}	// while (framesize > 0)

	execVarSelectors();

	return VM.state.executionStack.length == 0 ? null : VM.state.executionStack[VM.state.executionStack.length - 1];
}

function execVarSelectors() {
	// Executes all varselector read/write ops on the TOS
	while (VM.state.executionStack.length > 0 && VM.state.executionStack[VM.state.executionStack.length - 1].type == ExecStackType.EXEC_STACK_TYPE_VARSELECTOR) {
		var xs = VM.state.executionStack[VM.state.executionStack.length - 1];
		
		var varPtr = xs.getVarPointer();
		if (varPtr == null) {
			Debug.error("Invalid varselector exec stack entry");
		} else {
			// varselector access?
			if (xs.argc > 0) { // write?
			    Debug.log("Selector", "Writing " + VM.state.stack[xs.variablesArgp + 1].toString() + " ; prev value = " + varPtr.toString());
				varPtr.set(VM.state.stack[xs.variablesArgp + 1]);

			} else // No, read
				VM.state.acc.set(varPtr);
		}
		VM.state.executionStack.pop();
	}
}
