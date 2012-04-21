function kGraph(args) {
    return new Reg(0, 0);
}

function kGraphGetColorCount(args) {
    // TODO non-EGA games!
    return new Reg(0, 16);
}

kGraph.prototype = {
    subFunctions : {
        0 : createStubFunction("GraphStub0"),
        1 : createStubFunction("GraphStub1"),
        2 : kGraphGetColorCount,
        3 : createStubFunction("GraphStub3"),
        4 : createStubFunction("GraphStub4"),
        5 : createStubFunction("GraphStub5"),
        6 : createStubFunction("GraphStub6"),
        7 : createStubFunction("GraphStub7"),
        8 : createStubFunction("GraphStub8"),
        9 : createStubFunction("GraphStub9"),
        10 : createStubFunction("GraphStub10"),
        11 : createStubFunction("GraphStub11"),
        12 : createStubFunction("GraphStub12"),
        13 : createStubFunction("GraphStub13"),
        14 : createStubFunction("GraphStub14"),
        15 : createStubFunction("GraphStub15"),
    }
};

// TODO
function kAnimate(args) {
    var castListReference = (args.length > 0) ? args[0] : new Reg(0, 0);
	var cycle = (args.length > 1) ? ((args[1].toUint16()) ? true : false) : false;
	
	GfxAnimate.kernelAnimate(castListReference, cycle, args);
	//Debug.warn("Animating: list: " + castListReference.toString() + " cycle: " + cycle);
	
	return VM.state.acc;
}

// TODO
function kDrawPic(args) {
	var pictureId = args[0].toUint16();

    var img = ResourceManager.loadPic(pictureId);
    
    if(img != null) {
        /*for(var x = 0; x<16; x++) {
            Screen.getContext().drawImage(img, x * 320, 0, 320, 200, 0, 0, 320, 200);
        }*/
        GfxScreen.drawPic(img);
    }
    else {
        throw VM_LOAD_STALL;
    }
    
    return VM.state.acc;
}

function canBeHereCheckRectList(checkObject, checkRect, list) {
	var curAddress = list.first;
	var curNode = SegManager.lookupNode(curAddress);
	var curObject;
	var signal;
	var curRect = new Rect();

	while (curNode != null) {
		curObject = curNode.value;
		if (curObject != checkObject) {
			signal = readSelectorValue(curObject, SelectorCache.signal);
			if (!(signal & (ViewSignals.IgnoreActor | ViewSignals.RemoveView | ViewSignals.NoUpdate))) {
				curRect.left = readSelectorValueSigned(curObject, SelectorCache.brLeft);
				curRect.top = readSelectorValueSigned(curObject, SelectorCache.brTop);
				curRect.right = readSelectorValueSigned(curObject, SelectorCache.brRight);
				curRect.bottom = readSelectorValueSigned(curObject, SelectorCache.brBottom);
				// Check if curRect is within checkRect
				// This behavior is slightly odd, but it's how the original SCI
				// engine did it: a rect cannot be contained within itself
				// (there is no equality). Do NOT change this to contains(), as
				// it breaks KQ4 early (bug #3315639).
				if (curRect.right > checkRect.left &&
					curRect.left < checkRect.right &&
					curRect.bottom > checkRect.top &&
					curRect.top < checkRect.bottom)
					return curObject;
			}
		}
		curAddress = curNode.succ;
		curNode = SegManager.lookupNode(curAddress);
	}
	return new Reg(0, 0);
}

// TODO
function kernelCanBeHere(curObject, listReference) {
    var checkRect = new Rect();
	var adjustedRect = new Rect();
	var signal, controlMask;
	var result;

	checkRect.left = readSelectorValueSigned(curObject, SelectorCache.brLeft);
	checkRect.top = readSelectorValueSigned(curObject, SelectorCache.brTop);
	checkRect.right = readSelectorValueSigned(curObject, SelectorCache.brRight);
	checkRect.bottom = readSelectorValueSigned(curObject, SelectorCache.brBottom);

	if (!checkRect.isValidRect()) {	// can occur in Iceman and Mother Goose - HACK? TODO: is this really occuring in sierra sci? check this
		Debug.warn("kCan(t)BeHere - invalid rect!");
		return new Reg(0, 0); // this means "can be here"
	}

	adjustedRect = adjustOnControl(checkRect);

	signal = readSelectorValue(curObject, SelectorCache.signal);
	controlMask = readSelectorValue(curObject, SelectorCache.illegalBits);
	result = isOnControl(GfxScreenMasks.CONTROL, adjustedRect) & controlMask;
	if ((!result) && (signal & (ViewSignals.IgnoreActor | ViewSignals.RemoveView)) == 0) {
		var list = SegManager.lookupList(listReference);
		if (list == null)
			Debug.error("kCanBeHere called with non-list as parameter");

		return canBeHereCheckRectList(curObject, checkRect, list);
	}
	return new Reg(0, result);
}

function kCanBeHere(args) {
	var curObject = args[0];
	var listReference = (args.length > 1) ? args[1] : new Reg(0, 0);

    return new Reg(0, 1);

	var canBeHere = kernelCanBeHere(curObject, listReference);
	
    return new Reg(0, canBeHere.isNull() ? 1 : 0);
}


function kNumLoops(args) {
	var object = args[0];
	var viewId = readSelectorValue(object, SelectorCache.view);
	var loopCount;

    var view = ResourceManager.loadView(viewId);
    
    if(view == null) {
        throw VM_LOAD_STALL;
    }

	loopCount = view.getLoopCount();

	return new Reg(0, loopCount);
}

function kNumCels(args) {
	var object = args[0];
	var viewId = readSelectorValue(object, SelectorCache.view);
	var loopNo = readSelectorValueSigned(object, SelectorCache.loop);
	var celCount = 1;

    var view = ResourceManager.loadView(viewId);
    
    if(view == null) {
        throw VM_LOAD_STALL;
    }
    
    celCount = view.getNumCels(loopNo);
	//celCount = g_sci->_gfxCache->kernelViewGetCelCount(viewId, loopNo);

//	debugC(kDebugLevelGraphics, "NumCels(view.%d, %d) = %d", viewId, loopNo, celCount);
    Debug.log("KGraphics", "NumCels(view." + viewId + ", " + loopNo + ") = " + celCount);

	return new Reg(0, celCount);
}

function kBaseSetter(args) {
    var object = args[0];

    if (lookupSelector(object, SelectorCache.brLeft, null, null) == SelectorType.Variable) {
		var x = readSelectorValueSigned(object, SelectorCache.x);
		var y = readSelectorValueSigned(object, SelectorCache.y);
		var z = (SelectorCache.z > -1) ? readSelectorValueSigned(object, SelectorCache.z) : 0;
		var yStep = readSelectorValueSigned(object, SelectorCache.yStep);
		var viewId = readSelectorValue(object, SelectorCache.view);
		var loopNo = readSelectorValueSigned(object, SelectorCache.loop);
		var celNo = readSelectorValueSigned(object, SelectorCache.cel);

		// HACK: Ignore invalid views for now (perhaps unimplemented text views?)
		if (viewId == 0xFFFF)	// invalid view
			return VM.state.acc;

		var scaleSignal = 0;
		if (getSciVersion() >= SciVersion.SCI_VERSION_1_1) {
			scaleSignal = readSelectorValue(_segMan, object, SelectorCache.scaleSignal);
		}

		var celRect = new Rect();

		var tmpView = ResourceManager.loadView(viewId);
		
		if(tmpView == null) {
		    throw VM_LOAD_STALL;
		}
		
		if (!tmpView.isScaleable())
			scaleSignal = 0;

		if (scaleSignal & ViewScaleSignals.DoScaling) {
			//celRect = getNSRect(object);
		} else {
			if (tmpView.isSci2Hires())
				tmpView.adjustToUpscaledCoordinates(y, x);

			tmpView.getCelRect(loopNo, celNo, x, y, z, celRect);

			if (tmpView.isSci2Hires()) {
				tmpView.adjustBackUpscaledCoordinates(celRect.top, celRect.left);
				tmpView.adjustBackUpscaledCoordinates(celRect.bottom, celRect.right);
			}
		}

		celRect.bottom = y + 1;
		celRect.top = celRect.bottom - yStep;

		writeSelectorValue(object, SelectorCache.brLeft, celRect.left);
		writeSelectorValue(object, SelectorCache.brRight, celRect.right);
		writeSelectorValue(object, SelectorCache.brTop, celRect.top);
		writeSelectorValue(object, SelectorCache.brBottom, celRect.bottom);
	}

    return VM.state.acc;
}

function kDirLoop(args) {
    kDirLoopWorker(args[0], args[1].toUint16(), args);

	return VM.state.acc;
}

function kDirLoopWorker(object, angle, args) {
	var viewId = readSelectorValue(object, SelectorCache.view);
	var signal = readSelectorValue(object, SelectorCache.signal);

	if ((signal & ViewSignals.DoesntTurn) != 0)
		return;

	var useLoop = -1;
	if (getSciVersion() > SciVersion.SCI_VERSION_0_EARLY) {
		if ((angle > 315) || (angle < 45)) {
			useLoop = 3;
		} else if ((angle > 135) && (angle < 225)) {
			useLoop = 2;
		}
	} else {
		// SCI0EARLY
		if ((angle > 330) || (angle < 30)) {
			useLoop = 3;
		} else if ((angle > 150) && (angle < 210)) {
			useLoop = 2;
		}
	}
	if (useLoop == -1) {
		if (angle >= 180) {
			useLoop = 1;
		} else {
			useLoop = 0;
		}
	} else {
	    var view = ResourceManager.loadView(viewId);
	    if(view == null) {
	        throw VM_LOAD_STALL;
	    }
		var loopCount = view.getLoopCount();
		if (loopCount < 4)
			return;
	}

	writeSelectorValue(object, SelectorCache.loop, useLoop);
}

// TODO
function strSplit(text) {
    return text;
}

// TODO
function lookupText(address, index) {
	var seeker;
	var textres;

	if (address.segment != 0)
		return SegManager.getString(address);

	var textlen;
	var _index = index;
	textres = ResourceManager.loadText(address.offset);
	
	if(textres == null)
	    throw VM_LOAD_STALL;

	textlen = textres.length;
	seeker = 0;

    return textres.substr(index);

/*	while (index--)
		while ((textlen--) && (textres.charCodeAt(seeker++) != 0))
			;

	if (textlen > 0)
		return seeker;

	Debug.error("Index " + _index + " out of bounds in text." + address.offset);
	return "";*/
}


function kDisplay(args) {
	var textp = args[0];
	var index = (args.length > 1) ? args[1].toUint16() : 0;

	var text;

	if (textp.segment != 0) {
	    args.shift();
		text = SegManager.getString(textp);
	} else {
		args.shift(); 		
		args.shift();
		text = lookupText(textp, index);
	}
	
/*	if(text == VM_LOAD_STALL) {
	    throw VM_LOAD_STALL;
	}*/
	
	Debug.log("Display: " + text);

	return kernelDisplay(strSplit(text), args);
}

function kernelDisplay(text, args) {
	var displayArg = new Reg(0, 0);
	var alignment = SCI_TEXT16_ALIGNMENT_LEFT;
	var colorPen = -1, colorBack = -1, width = -1, bRedraw = 1;
	var doSaveUnder = false;
	var rect = new Rect();
	var result = new Reg(0, 0);

	// Make a "backup" of the port settings (required for some SCI0LATE and
	// SCI01+ only)
/*	Port oldPort = *_ports->getPort();

	// setting defaults
	_ports->penMode(0);
	_ports->penColor(0);
	_ports->textGreyedOutput(false);
	// processing codes in argv
	while (argc > 0) {
		displayArg = argv[0];
		if (displayArg.segment)
			displayArg.offset = 0xFFFF;
		argc--; argv++;
		switch (displayArg.offset) {
		case SCI_DISPLAY_MOVEPEN:
			_ports->moveTo(argv[0].toUint16(), argv[1].toUint16());
			argc -= 2; argv += 2;
			break;
		case SCI_DISPLAY_SETALIGNMENT:
			alignment = argv[0].toSint16();
			argc--; argv++;
			break;
		case SCI_DISPLAY_SETPENCOLOR:
			colorPen = argv[0].toUint16();
			_ports->penColor(colorPen);
			argc--; argv++;
			break;
		case SCI_DISPLAY_SETBACKGROUNDCOLOR:
			colorBack = argv[0].toUint16();
			argc--; argv++;
			break;
		case SCI_DISPLAY_SETGREYEDOUTPUT:
			_ports->textGreyedOutput(argv[0].isNull() ? false : true);
			argc--; argv++;
			break;
		case SCI_DISPLAY_SETFONT:
			_text16->SetFont(argv[0].toUint16());
			argc--; argv++;
			break;
		case SCI_DISPLAY_WIDTH:
			width = argv[0].toUint16();
			argc--; argv++;
			break;
		case SCI_DISPLAY_SAVEUNDER:
			doSaveUnder = true;
			break;
		case SCI_DISPLAY_RESTOREUNDER:
			bitsGetRect(argv[0], &rect);
			rect.translate(-_ports->getPort()->left, -_ports->getPort()->top);
			bitsRestore(argv[0]);
			kernelGraphRedrawBox(rect);
			// finishing loop
			argc = 0;
			break;
		case SCI_DISPLAY_DONTSHOWBITS:
			bRedraw = 0;
			break;

		// The following three dummy calls are not supported by the Sierra SCI
		// interpreter, but are erroneously called in some game scripts.
		case SCI_DISPLAY_DUMMY1:	// Longbow demo (all rooms) and QFG1 EGA demo (room 11)
		case SCI_DISPLAY_DUMMY2:	// Longbow demo (all rooms)
		case SCI_DISPLAY_DUMMY3:	// QFG1 EGA demo (room 11) and PQ2 (room 23)
			if (!(g_sci->getGameId() == GID_LONGBOW && g_sci->isDemo()) &&
				!(g_sci->getGameId() == GID_QFG1    && g_sci->isDemo()) &&
				!(g_sci->getGameId() == GID_PQ2))
				error("Unknown kDisplay argument %d", displayArg.offset);

			if (displayArg.offset == SCI_DISPLAY_DUMMY2) {
				if (!argc)
					error("No parameter left for kDisplay(115)");
				argc--; argv++;
			}
			break;
		default:
			SciTrackOriginReply originReply;
			SciWorkaroundSolution solution = trackOriginAndFindWorkaround(0, kDisplay_workarounds, &originReply);
			if (solution.type == WORKAROUND_NONE)
				error("Unknown kDisplay argument (%04x:%04x) from method %s::%s (script %d, localCall %x)", 
						PRINT_REG(displayArg), originReply.objectName.c_str(), originReply.methodName.c_str(), 
						originReply.scriptNr, originReply.localCallOffset);
			assert(solution.type == WORKAROUND_IGNORE);
			break;
		}
	}
*/
/*
	// now drawing the text
	_text16->Size(rect, text, -1, width);
	rect.moveTo(_ports->getPort()->curLeft, _ports->getPort()->curTop);
	// Note: This code has been found in SCI1 middle and newer games. It was
	// previously only for SCI1 late and newer, but the LSL1 interpreter contains
	// this code.
	if (getSciVersion() >= SCI_VERSION_1_MIDDLE) {
		int16 leftPos = rect.right <= _screen->getWidth() ? 0 : _screen->getWidth() - rect.right;
		int16 topPos = rect.bottom <= _screen->getHeight() ? 0 : _screen->getHeight() - rect.bottom;
		_ports->move(leftPos, topPos);
		rect.moveTo(_ports->getPort()->curLeft, _ports->getPort()->curTop);
	}

	if (doSaveUnder)
		result = bitsSave(rect, GFX_SCREEN_MASK_VISUAL);
	if (colorBack != -1)
		fillRect(rect, GFX_SCREEN_MASK_VISUAL, colorBack, 0, 0);
	_text16->Box(text, false, rect, alignment, -1);
	if (_screen->_picNotValid == 0 && bRedraw)
		bitsShow(rect);
	// restoring port and cursor pos
	Port *currport = _ports->getPort();
	uint16 tTop = currport->curTop;
	uint16 tLeft = currport->curLeft;
	if (!g_sci->_features->usesOldGfxFunctions()) {
		// Restore port settings for some SCI0LATE and SCI01+ only.
		//
		// The change actually happened inbetween .530 (hoyle1) and .566 (heros
		// quest). We don't have any detection for that currently, so we are
		// using oldGfxFunctions (.502). The only games that could get
		// regressions because of this are hoyle1, kq4 and funseeker. If there
		// are regressions, we should use interpreter version (which would
		// require exe version detection).
		//
		// If we restore the port for whole SCI0LATE, at least sq3old will get
		// an issue - font 0 will get used when scanning for planets instead of
		// font 600 - a setfont parameter is missing in one of the kDisplay
		// calls in script 19. I assume this is a script bug, because it was
		// added in sq3new.
		*currport = oldPort;
	}
	currport->curTop = tTop;
	currport->curLeft = tLeft;
	return result;*/
	
	return new Reg(0, 0);
}


/*function kDrawMenuBar(args) {
    var clear = args[0].isNull() ? true : false;

	g_sci->_gfxMenu->kernelDrawMenuBar(clear);
	return VM.state.acc;
}*/

function adjustOnControl(rect) {
	var oldPort = GfxPorts.setPort(GfxPorts.picWind());
	var adjustedRect = rect.clone();

	adjustedRect.clip(GfxPorts.getPort().rect);
	GfxPorts.offsetRect(adjustedRect);
	GfxPorts.setPort(oldPort);
	return adjustedRect;
}

function kernelOnControl(screenMask, rect) {
    var adjustedRect = adjustOnControl(rect);
    return isOnControl(screenMask, adjustedRect);
}

function isOnControl(screenMask, rect) {
	var x, y;
	var result = 0;

	if (rect.isEmpty())
		return 0;

	if (screenMask & GfxScreenMasks.PRIORITY) {
		for (y = rect.top; y < rect.bottom; y++) {
			for (x = rect.left; x < rect.right; x++) {
				result |= 1 << GfxScreen.getPriority(x, y);
			}
		}
	} else {
		for (y = rect.top; y < rect.bottom; y++) {
			for (x = rect.left; x < rect.right; x++) {
				result |= 1 << GfxScreen.getControl(x, y);
			}
		}
	}
	return result;    
}

function kOnControl(args) {
	var rect = new Rect();
	var screenMask;
	var argBase = 0;

	if ((args.length == 2) || (args.length == 4)) {
		screenMask = GfxScreenMasks.CONTROL;
	} else {
		screenMask = args[0].toUint16();
		argBase = 1;
	}
	rect.left = args[argBase].toSint16();
	rect.top = args[argBase + 1].toSint16();
	if (args > 3) {
		rect.right = args[argBase + 2].toSint16();
		rect.bottom = args[argBase + 3].toSint16();
	} else {
		rect.right = rect.left + 1;
		rect.bottom = rect.top + 1;
	}
	var result = kernelOnControl(screenMask, rect);
	return new Reg(0, result);
}