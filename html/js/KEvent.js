var SCI_EVENT_NONE = 0;
var SCI_EVENT_MOUSE_PRESS =    (1<<0)
var SCI_EVENT_MOUSE_RELEASE =  (1<<1)
var SCI_EVENT_KEYBOARD =       (1<<2)
var SCI_EVENT_DIRECTION =      (1<<6)
var SCI_EVENT_SAID =           (1<<7)

var SCI_KEY_HOME = (71 << 8)	// 7
var SCI_KEY_UP = (72 << 8)		// 8
var SCI_KEY_PGUP = (73 << 8)	// 9
//
var SCI_KEY_LEFT = (75 << 8)	// 4
var SCI_KEY_CENTER = (76 << 8)	// 5
var SCI_KEY_RIGHT = (77 << 8)	// 6
//
var SCI_KEY_END = (79 << 8)		// 1
var SCI_KEY_DOWN = (80 << 8)	// 2
var SCI_KEY_PGDOWN = (81 << 8)	// 3

function mapKey(key) {
    switch(key) {
        case Input.left:
            return SCI_KEY_LEFT;
        case Input.right:
            return SCI_KEY_RIGHT;
        case Input.up:
            return SCI_KEY_UP;
        case Input.down:
            return SCI_KEY_DOWN;
        default:
            return key;
    }
}

function SciEvent() {
	this.type = 0;
	this.data = 0;
	this.modifiers = 0;
	/**
	 * For keyboard events: 'data' after applying
	 * the effects of 'modifiers', e.g. if
	 *   type == SCI_EVT_KEYBOARD
	 *   data == 'a'
	 *   buckybits == SCI_EVM_LSHIFT
	 * then
	 *   character == 'A'
	 * For 'Alt', characters are interpreted by their
	 * PC keyboard scancodes.
	 */
	this.character = SCI_KEY_LEFT;

	/**
	 * The mouse position at the time the event was created.
	 *
	 * These are display coordinates!
	 */
	this.mousePos = new Point();
};

function kGetEvent(args) {
	var mask = args[0].toUint16();
	var obj = args[1];
	var curEvent = new SciEvent();
//	var modifier_mask = getSciVersion() <= SciVersion.SCI_VERSION_01 ? SCI_KEYMOD_ALL : SCI_KEYMOD_NO_FOOLOCK;
	var mousePos = new Point();

	// For Mac games with an icon bar, handle possible icon bar events first
/*	if (g_sci->hasMacIconBar()) {
		reg_t iconObj = g_sci->_gfxMacIconBar->handleEvents();
		if (!iconObj.isNull())
			invokeSelector(s, iconObj, SELECTOR(select), argc, argv, 0, NULL);
	}
*/
	// If there's a simkey pending, and the game wants a keyboard event, use the
	// simkey instead of a normal event
	/*if (g_debug_simulated_key && (mask & SCI_EVENT_KEYBOARD)) {
		// In case we use a simulated event we query the current mouse position
		mousePos = g_sci->_gfxCursor->getPosition();
#ifdef ENABLE_SCI32
		if (getSciVersion() >= SCI_VERSION_2_1)
			g_sci->_gfxCoordAdjuster->fromDisplayToScript(mousePos.y, mousePos.x);
#endif
		// Limit the mouse cursor position, if necessary
		g_sci->_gfxCursor->refreshPosition();

		writeSelectorValue(segMan, obj, SELECTOR(type), SCI_EVENT_KEYBOARD); // Keyboard event
		writeSelectorValue(segMan, obj, SELECTOR(message), g_debug_simulated_key);
		writeSelectorValue(segMan, obj, SELECTOR(modifiers), SCI_KEYMOD_NUMLOCK); // Numlock on
		writeSelectorValue(segMan, obj, SELECTOR(x), mousePos.x);
		writeSelectorValue(segMan, obj, SELECTOR(y), mousePos.y);
		g_debug_simulated_key = 0;
		return make_reg(0, 1);
	}*/

	//curEvent = g_sci->getEventManager()->getSciEvent(mask);

	// For a real event we use its associated mouse position
	/*mousePos = curEvent.mousePos;
#ifdef ENABLE_SCI32
	if (getSciVersion() >= SCI_VERSION_2_1)
		g_sci->_gfxCoordAdjuster->fromDisplayToScript(mousePos.y, mousePos.x);
#endif
	// Limit the mouse cursor position, if necessary
	g_sci->_gfxCursor->refreshPosition();

	if (g_sci->getVocabulary())
		g_sci->getVocabulary()->parser_event = NULL_REG; // Invalidate parser event

	if (s->_cursorWorkaroundActive) {
		// ffs: GfxCursor::setPosition()
		// we check, if actual cursor position is inside given rect
		//  if that's the case, we switch ourself off. Otherwise
		//  we simulate the original set position to the scripts
		if (s->_cursorWorkaroundRect.contains(mousePos.x, mousePos.y)) {
			s->_cursorWorkaroundActive = false;
		} else {
			mousePos.x = s->_cursorWorkaroundPoint.x;
			mousePos.y = s->_cursorWorkaroundPoint.y;
		}
	}*/
	
	var mousePos = Input.getMousePosition();

	writeSelectorValue(obj, SelectorCache.x, mousePos.x);
	writeSelectorValue(obj, SelectorCache.y, mousePos.y);

	//s->_gui->moveCursor(s->gfx_state->pointer_pos.x, s->gfx_state->pointer_pos.y);

	/*switch (curEvent.type) {
	case SCI_EVENT_QUIT:
		s->abortScriptProcessing = kAbortQuitGame; // Terminate VM
		g_sci->_debugState.seeking = kDebugSeekNothing;
		g_sci->_debugState.runningStep = 0;
		break;

	case SCI_EVENT_KEYBOARD:
		writeSelectorValue(segMan, obj, SELECTOR(type), SCI_EVENT_KEYBOARD); // Keyboard event
		s->r_acc = make_reg(0, 1);

		writeSelectorValue(segMan, obj, SELECTOR(message), curEvent.character);
		// We only care about the translated character
		writeSelectorValue(segMan, obj, SELECTOR(modifiers), curEvent.modifiers & modifier_mask);
		break;

	case SCI_EVENT_MOUSE_RELEASE:
	case SCI_EVENT_MOUSE_PRESS:

		// track left buttton clicks, if requested
		if (curEvent.type == SCI_EVENT_MOUSE_PRESS && curEvent.data == 1 && g_debug_track_mouse_clicks) {
			g_sci->getSciDebugger()->DebugPrintf("Mouse clicked at %d, %d\n",
						mousePos.x, mousePos.y);
		}

		if (mask & curEvent.type) {
			int extra_bits = 0;

			switch (curEvent.data) {
			case 2:
				extra_bits = SCI_KEYMOD_LSHIFT | SCI_KEYMOD_RSHIFT;
				break;
			case 3:
				extra_bits = SCI_KEYMOD_CTRL;
			default:
				break;
			}

			writeSelectorValue(segMan, obj, SELECTOR(type), curEvent.type);
			writeSelectorValue(segMan, obj, SELECTOR(message), 0);
			writeSelectorValue(segMan, obj, SELECTOR(modifiers), (curEvent.modifiers | extra_bits) & modifier_mask);
			s->r_acc = make_reg(0, 1);
		}
		break;

	default:*/ {
		// Return a null event
		writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_NONE);
		writeSelectorValue(obj, SelectorCache.message, 0);
		writeSelectorValue(obj, SelectorCache.modifiers, 0);
//		writeSelectorValue(obj, SelectorCache.modifiers, curEvent.modifiers & modifier_mask);
		VM.state.acc = new Reg(0, 0);
	}

/*	if ((s->r_acc.offset) && (g_sci->_debugState.stopOnEvent)) {
		g_sci->_debugState.stopOnEvent = false;

		// A SCI event occurred, and we have been asked to stop, so open the debug console
		Console *con = g_sci->getSciDebugger();
		con->DebugPrintf("SCI event occurred: ");
		switch (curEvent.type) {
		case SCI_EVENT_QUIT:
			con->DebugPrintf("quit event\n");
			break;
		case SCI_EVENT_KEYBOARD:
			con->DebugPrintf("keyboard event\n");
			break;
		case SCI_EVENT_MOUSE_RELEASE:
		case SCI_EVENT_MOUSE_PRESS:
			con->DebugPrintf("mouse click event\n");
			break;
		default:
			con->DebugPrintf("unknown or no event (event type %d)\n", curEvent.type);
		}

		con->attach();
		con->onFrame();
	}
*/
	/*if (g_sci->_features->detectDoSoundType() <= SCI_VERSION_0_LATE) {
		// If we're running a sound-SCI0 game, update the sound cues, to
		// compensate for the fact that sound-SCI0 does not poll to update
		// the sound cues itself, like sound-SCI1 and later do with
		// cmdUpdateSoundCues. kGetEvent is called quite often, so emulate
		// the sound-SCI1 behavior of cmdUpdateSoundCues with this call
		g_sci->_soundCmd->updateSci0Cues();
	}*/

	// Wait a bit here, so that the CPU isn't maxed out when the game
	// is waiting for user input (e.g. when showing text boxes) - bug
	// #3037874. Make sure that we're not delaying while the game is
	// benchmarking, as that will affect the final benchmarked result -
	// check bugs #3058865 and #3127824
/*	if (s->_gameIsBenchmarking) {
		// Game is benchmarking, don't add a delay
	} else {
		g_system->delayMillis(10);
	}
*/
    var ev = Input.getEvent();
    
    if(ev != null) {
        if(ev.type == "keydown") {
            writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_KEYBOARD); // Keyboard event
            VM.state.acc = new Reg(0, 1);
    
            writeSelectorValue(obj, SelectorCache.message, mapKey(ev.keyCode));
            // We only care about the translated character
            writeSelectorValue(obj, SelectorCache.modifiers, 0x0);
        }
        else if(ev.type == "mousedown") {
            writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_MOUSE_PRESS);
            writeSelectorValue(obj, SelectorCache.message, 0);
            writeSelectorValue(obj, SelectorCache.modifiers, 0x0);
            VM.state.acc = new Reg(0, 1);
        }
        else if(ev.type == "mouseup") {
            writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_MOUSE_RELEASE);
            writeSelectorValue(obj, SelectorCache.message, 0);
            writeSelectorValue(obj, SelectorCache.modifiers, 0x0);
            VM.state.acc = new Reg(0, 1);
        }
        else Debug.log(ev);
       // Debug.log(ev);
    }
/*    if(Input.getKey(Input.up)) {
		writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_KEYBOARD); // Keyboard event
		VM.state.acc = new Reg(0, 1);

		writeSelectorValue(obj, SelectorCache.message, curEvent.character);
		// We only care about the translated character
		writeSelectorValue(obj, SelectorCache.modifiers, 0x0);
    }
    
    if(Input.getKey(Input.left)) {
        // track left buttton clicks, if requested
        writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_MOUSE_PRESS);
        writeSelectorValue(obj, SelectorCache.message, 0);
        writeSelectorValue(obj, SelectorCache.modifiers, 0xFF);
        VM.state.acc = new Reg(0, 1);
    }*/

	return VM.state.acc;
}

function kernelGlobalToLocal(coord, planeObject) {
	var curPort = GfxPorts.getPort();
	coord.x -= curPort.left;
	coord.y -= curPort.top;
}

function kernelLocalToGlobal(coord, planeObject) {
	var curPort = GfxPorts.getPort();
	coord.x += curPort.left;
	coord.y += curPort.top;
}

function kGlobalToLocal(args) {
	var obj = args[0];
	var planeObject = args.length > 1 ? args[1] : new Reg(0, 0); // SCI32

	if (obj.segment != 0) {
		var coord = 
		{
			x : readSelectorValueSigned(obj, SelectorCache.x),
			y : readSelectorValueSigned(obj, SelectorCache.y)
		};

        kernelGlobalToLocal(coord, planeObject);

		writeSelectorValue(obj, SelectorCache.x, coord.x);
		writeSelectorValue(obj, SelectorCache.y, coord.y);
	}

	return VM.state.acc;

}

var keyToDirMap = [
	{ key: SCI_KEY_HOME, dir : 8 }, 
	{ key: SCI_KEY_UP, dir : 1},
	{ key: SCI_KEY_PGUP, dir : 2},
	{ key: SCI_KEY_LEFT, dir : 7},
	{ key: SCI_KEY_CENTER, dir : 0}, 
	{ key: SCI_KEY_RIGHT, dir : 3},
	{ key: SCI_KEY_END, dir :  6},
	{ key: SCI_KEY_DOWN, dir :  5},
	{ key: SCI_KEY_PGDOWN, dir : 4}
];

function kMapKeyToDir(args) {
	var obj = args[0];

	if (readSelectorValue(obj, SelectorCache.type) == SCI_EVENT_KEYBOARD) { // Keyboard
		var message = readSelectorValue(obj, SelectorCache.message);
		var eventType = SCI_EVENT_DIRECTION;
		// Check if the game is using cursor views. These games allowed control
		// of the mouse cursor via the keyboard controls (the so called
		// "PseudoMouse" functionality in script 933).
		/*if (g_sci->_features->detectSetCursorType() == SCI_VERSION_1_1)
			eventType |= SCI_EVENT_KEYBOARD;
*/
        for(var x in keyToDirMap) {
            if(keyToDirMap[x].key == message) {
                writeSelectorValue(obj, SelectorCache.type, eventType);
                writeSelectorValue(obj, SelectorCache.message, keyToDirMap[x].dir);
                return new Reg(0, 1);	// direction mapped
            }
        }
		return new Reg(0, 0);	// unknown direction
	}

	return VM.state.acc;	// no keyboard event to map, leave accumulator unchanged
}

function kJoystick(args) {
    return new Reg(0, 0);
}