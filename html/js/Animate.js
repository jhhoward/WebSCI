// Flags for the signal selector
var ViewSignals = {
	StopUpdate    : 0x0001,
	ViewUpdated   : 0x0002,
	NoUpdate      : 0x0004,
	Hidden        : 0x0008,
	FixedPriority : 0x0010,
	AlwaysUpdate  : 0x0020,
	ForceUpdate   : 0x0040,
	RemoveView    : 0x0080,
	Frozen        : 0x0100, // I got frozen today!!
	//ExtraActor	 : 0x0200, // unused by us, defines all actors that may be included into the background if speed is too slow
	HitObstacle	 : 0x0400, // used in the actor movement code by kDoBresen()
	DoesntTurn	 : 0x0800, // used by _k_dirloop() to determine if an actor can turn or not
	//NoCycler		 : 0x1000, // unused by us
	//IgnoreHorizon : 0x2000, // unused by us, defines actor that can ignore horizon
	IgnoreActor   : 0x4000,
	DisposeMe     : 0x8000
};

function AnimateEntry() {
	this.givenOrderNo;
	this.object = new Reg(0, 0);
	this.viewId = 0;
	this.loopNo = 0;
	this.celNo = 0;
	this.paletteNo = 0;
	this.x = 0;
	this.y = 0;
	this.z = 0;
	this.priority = 0;
	this.signal = 0;
	this.scaleSignal = 0;
	this.scaleX = 0;
	this.scaleY = 0;
	this.celRect = new Rect();
	this.showBitsFlag = false;
	this.castHandle = new Reg(0, 0);
}

var GfxAnimate = (function() {
    var lastCastData = [];
    var ignoreFastCast = true;
    var cache = [];
    var animList = [];
    
    var init = function() {
        lastCastData = [];
    
        ignoreFastCast = false;
        // fastCast object is not found in any SCI games prior SCI1
        if (getSciVersion() <= SciVersion.SCI_VERSION_01)
            ignoreFastCast = true;
        // Also if fastCast object exists at gamestartup, we can assume that the interpreter doesnt do kAnimate aborts
        //  (found in Larry 1)
        if (getSciVersion() > SciVersion.SCI_VERSION_0_EARLY) {
            if (SegManager.findObjectByName("fastCast").isNull())
                ignoreFastCast = true;
        }    
    }

    var disposeLastCast = function() {
        lasCastData = [];
    }
    
    var invoke = function(list, args) {
        var curAddress = list.first;
        var curNode = SegManager.lookupNode(curAddress);
        var curObject;
        var signal = 0;
    
        while (curNode != null) {
            curObject = curNode.value;
    
            // TODO
            /*if (!ignoreFastCast) {
                // Check if the game has a fastCast object set
                //  if we don't abort kAnimate processing, at least in kq5 there will be animation cels drawn into speech boxes.
                if (!_s->variables[VAR_GLOBAL][84].isNull()) {
                    if (!strcmp(_s->_segMan->getObjectName(_s->variables[VAR_GLOBAL][84]), "fastCast"))
                        return false;
                }
            }*/
    
            signal = readSelectorValue(curObject, SelectorCache.signal);
            if (!(signal & ViewSignals.Frozen)) {
                // Call .doit method of that object
                //Debug.warn("Not sure how to do this yet..");
                
                var argv = 	VM.state.xs.sp + 1;
                invokeSelector(curObject, SelectorCache.doit, args.length, argv, []);
    
                // If a game is being loaded, stop processing
                //if (_s->abortScriptProcessing != kAbortNone)
                  //  return true; // Stop processing
    
                // Lookup node again, since the nodetable it was in may have been reallocated.
                // The node might have been deallocated at this point (e.g. LSL2, room 42),
                // in which case the node reference will be null and the loop will stop below.
                // If the node is deleted from kDeleteKey, it won't have a successor node, thus
                // list processing will stop here (which is what SSCI does).
                curNode = SegManager.lookupNode(curAddress, false);
            }
    
            if (curNode != null) {
                curAddress = curNode.succ;
                curNode = SegManager.lookupNode(curAddress);
            }
        }
        return true;
    }
    
    function compareVal(a, b) {
        if(a == b)
            return 0;
        if(a < b)
            return -1;
        else return 1;
    }
    
    function sortHelper(entry1, entry2) {
        if (entry1.y == entry2.y) {
            // if both y and z are the same, use the order we were given originally
            //  this is needed for special cases like iceman room 35
            if (entry1.z == entry2.z)
                return compareVal(entry1.givenOrderNo, entry2.givenOrderNo);
            else
                return compareVal(entry1.z, entry2.z);
        }
        return compareVal(entry1.y, entry2.y);
    }
    
    var makeSortedList = function(list) {
        var curAddress = list.first;
        var curNode = SegManager.lookupNode(curAddress);
        var listNr;
    
        // Clear lists
        animList = [];
        lastCastData = [];
    
        // Fill the list
        for (listNr = 0; curNode != null; listNr++) {
            var listEntry = new AnimateEntry();
            var curObject = curNode.value;
            listEntry.object = curObject;
            listEntry.castHandle = new Reg(0, 0);
    
            // Get data from current object
            listEntry.givenOrderNo = listNr;
            listEntry.viewId = readSelectorValue(curObject, SelectorCache.view);
            listEntry.loopNo = readSelectorValueSigned(curObject, SelectorCache.loop);
            listEntry.celNo = readSelectorValueSigned(curObject, SelectorCache.cel);
            listEntry.paletteNo = readSelectorValueSigned(curObject, SelectorCache.palette);
            listEntry.x = readSelectorValueSigned(curObject, SelectorCache.x);
            listEntry.y = readSelectorValueSigned(curObject, SelectorCache.y);
            listEntry.z = readSelectorValueSigned(curObject, SelectorCache.z);
            listEntry.priority = readSelectorValueSigned(curObject, SelectorCache.priority);
            listEntry.signal = readSelectorValue(curObject, SelectorCache.signal);
            if (getSciVersion() >= SciVersion.SCI_VERSION_1_1) {
                // Cel scaling
                listEntry.scaleSignal = readSelectorValue(curObject, SelectorCache.scaleSignal);
                if (listEntry.scaleSignal & kScaleSignalDoScaling) {
                    listEntry.scaleX = readSelectorValueSigned(curObject, SelectorCache.scaleX);
                    listEntry.scaleY = readSelectorValueSigned(curObject, SelectorCache.scaleY);
                } else {
                    listEntry.scaleX = 128;
                    listEntry.scaleY = 128;
                }
            } else {
                listEntry.scaleSignal = 0;
                listEntry.scaleX = 128;
                listEntry.scaleY = 128;
            }
            // listEntry.celRect is filled in AnimateFill()
            listEntry.showBitsFlag = false;
    
            animList.push(listEntry);
    
            curAddress = curNode.succ;
            curNode = SegManager.lookupNode(curAddress);
        }
    
        // Possible TODO: As noted in the comment in sortHelper we actually
        // require a stable sorting algorithm here. Since Common::sort is not stable
        // at the time of writing this comment, we work around that in our ordering
        // comparator. If that changes in the future or we want to use some
        // stable sorting algorithm here, we should change that.
        // In that case we should test such changes intensively. A good place to test stable sort
        // is iceman, cupboard within the submarine. If sort isn't stable, the cupboard will be
        // half-open, half-closed. Of course that's just one of many special cases.
    
        // Now sort the list according y and z (descending)
        animList.sort(sortHelper);
    }
    
    var applyGlobalScaling = function(entry, view) {
        Debug.warn("applyGlobalScaling STUB");
    }
    
    var adjustInvalidCels = function(view, it) {
        // adjust loop and cel, if any of those is invalid
        //  this seems to be completely crazy code
        //  sierra sci checked signed int16 to be above or equal the counts and reseted to 0 in those cases
        //  later during view processing those are compared unsigned again and then set to maximum count - 1
        //  Games rely on this behavior. For example laura bow 1 has a knight standing around in room 37
        //   which has cel set to 3. This cel does not exist and the actual knight is 0
        //   In kq5 on the other hand during the intro, when the trunk is opened, cel is set to some real
        //   high number, which is negative when considered signed. This actually requires to get fixed to
        //   maximum cel, otherwise the trunk would be closed.
        var viewLoopCount = view.getLoopCount();
        if (it.loopNo >= viewLoopCount) {
            it.loopNo = 0;
            writeSelectorValue(it.object, SelectorCache.loop, it.loopNo);
        } else if (it.loopNo < 0) {
            it.loopNo = viewLoopCount - 1;
            // not setting selector is right, sierra sci didn't do it during view processing as well
        }
        var viewCelCount = view.getCelCount(it.loopNo);
        if (it.celNo >= viewCelCount) {
            it.celNo = 0;
            writeSelectorValue(it.object, SelectorCache.cel, it.celNo);
        } else if (it.celNo < 0) {
            it.celNo = viewCelCount - 1;
        }
    }
    
    var setNsRect = function(view, it) {
        var shouldSetNsRect = true;
    
        // Create rect according to coordinates and given cel
        if ((it.scaleSignal & ViewScaleSignals.DoScaling) != 0) {
            view.getCelScaledRect(it.loopNo, it.celNo, it.x, it.y, it.z, it.scaleX, it.scaleY, it.celRect);
            // when being scaled, only set nsRect, if object will get drawn
            if ((it.signal & ViewSignals.Hidden) && !(it.signal & ViewSignals.AlwaysUpdate))
                shouldSetNsRect = false;
        } else {
            //  This special handling is not included in the other SCI1.1 interpreters and MUST NOT be
            //  checked in those cases, otherwise we will break games (e.g. EcoQuest 2, room 200)
/*            if ((g_sci->getGameId() == GID_HOYLE4) && (it->scaleSignal & kScaleSignalHoyle4SpecialHandling)) {
                it->celRect = g_sci->_gfxCompare->getNSRect(it->object);
                view->getCelSpecialHoyle4Rect(it->loopNo, it->celNo, it->x, it->y, it->z, it->celRect);
                shouldSetNsRect = false;
            } else*/
            {
                view.getCelRect(it.loopNo, it.celNo, it.x, it.y, it.z, it.celRect);
            }
        }
    
        if (shouldSetNsRect) {
        //    g_sci->_gfxCompare->setNSRect(it->object, it->celRect);
        }
    }
    
    var fill = function(old_picNotValid) {
        var view = null;
    
        for (x in animList) {
            var it = animList[x];
            // Get the corresponding view
            view = ResourceManager.loadView(it.viewId);
            if(view == null) {
                throw VM_LOAD_STALL;
                // TODO VM_LOAD_STALL
                return;
            }
    
            adjustInvalidCels(view, it);
            // TODO
            //processViewScaling(view, it);
            setNsRect(view, it);
    
            //warning("%s view %d, loop %d, cel %d, signal %x", _s->_segMan->getObjectName(curObject), it.viewId, it.loopNo, it.celNo, it.signal);
    
            // Calculate current priority according to y-coordinate
            if ((it.signal & ViewSignals.FixedPriority) == 0) {
                it.priority = GfxPorts.kernelCoordinateToPriority(it.y);
                writeSelectorValue(it.object, SelectorCache.priority, it.priority);
            }
    
            if ((it.signal & ViewSignals.NoUpdate) != 0) {
                if (((it.signal & (ViewSignals.ForceUpdate | ViewSignals.ViewUpdated)) != 0)
                    ||   (it.signal & ViewSignals.Hidden  && !(it.signal & ViewSignals.RemoveView))
                    || (!(it.signal & ViewSignals.Hidden) &&   it.signal & ViewSignals.RemoveView)
                    ||   (it.signal & ViewSignals.AlwaysUpdate))
                    old_picNotValid++;
                it.signal &= ~ViewSignals.StopUpdate;
            } else {
                if ((it.signal & ViewSignals.StopUpdate) || (it.signal & ViewSignals.AlwaysUpdate))
                    old_picNotValid++;
                it.signal &= ~ViewSignals.ForceUpdate;
            }
        }
        
        return old_picNotValid;
    }
    
    var update = function() {
       // Debug.warn("update STUB");
    }
    
    function drawCel(view, loopNo, celNo, celRect, priority, paletteNo, scaleX, scaleY) {
		var clipRect = celRect.clone();
		//clipRect.clip(GfxPorts.getPort().rect);
		
		if (clipRect.isEmpty()) // nothing to draw
			return;
	
		var clipRectTranslated = clipRect.clone();
		GfxPorts.offsetRect(clipRectTranslated);
		
//		view.draw(celRect, clipRect, clipRectTranslated, loopNo, celNo, celRect, priority, paletteNo, false);
		view.draw(loopNo, celNo, clipRectTranslated.left, clipRectTranslated.top, priority);
		
		GfxScreen.restorePic(clipRectTranslated, priority + 1);
		
		/*if (scaleX == 128 && scaleY == 128)
			view->draw(celRect, clipRect, clipRectTranslated, loopNo, celNo, priority, paletteNo, false);
		else
			view->drawScaled(celRect, clipRect, clipRectTranslated, loopNo, celNo, priority, scaleX, scaleY);*/
	}
    
    var drawCels = function() {
        var bitsHandle = new Reg(0, 0);
        lastCastData = [];
    
        for (x in animList) {
            var it = animList[x];
            if ((it.signal & (ViewSignals.NoUpdate | ViewSignals.Hidden | ViewSignals.AlwaysUpdate)) == 0) {
                // Save background
               // bitsHandle = _paint16.bitsSave(it.celRect, GFX_SCREEN_MASK_ALL);
                //writeSelector(it.object, SelectorCache.underBits), bitsHandle);
    
                // draw corresponding cel
                //_paint16.drawCel(it.viewId, it.loopNo, it.celNo, it.celRect, it.priority, it.paletteNo, it.scaleX, it.scaleY);
                var view = ResourceManager.loadView(it.viewId);
                if(view != null) {
                	drawCel(view, it.loopNo, it.celNo, it.celRect, it.priority, it.paletteNo, it.scaleX, it.scaleY);
//                    view.draw(it.loopNo, it.celNo, it.celRect, it.priority, it.paletteNo, it.scaleX, it.scaleY);
                }
                
                it.showBitsFlag = true;
    
                if ((it.signal & ViewSignals.RemoveView) != 0)
                    it.signal &= ~ViewSignals.RemoveView;
    
                // Remember that entry in lastCast
                lastCastData.push(it);
            }
        }    
    }
    
    var updateScreen = function(oldPicNotValid) {
        var lsRect = new Rect();
        var workerRect = new Rect();
    
        for (x in animList) {
            var it = animList[x];
            
            if (it.showBitsFlag != 0 || !(it.signal & (ViewSignals.RemoveView | ViewSignals.NoUpdate) ||
                                            (!(it.signal & ViewSignals.RemoveView) && (it.signal & ViewSignals.NoUpdate) && oldPicNotValid))) {
                lsRect.left = readSelectorValueSigned(it.object, SelectorCache.lsLeft);
                lsRect.top = readSelectorValueSigned(it.object, SelectorCache.lsTop);
                lsRect.right = readSelectorValueSigned(it.object, SelectorCache.lsRight);
                lsRect.bottom = readSelectorValueSigned(it.object, SelectorCache.lsBottom);
    
                workerRect = lsRect.clone();
                workerRect.clip(it.celRect);
    
                if (!workerRect.isEmpty()) {
                    workerRect = lsRect.clone();
                    workerRect.extend(it.celRect);
                } else {
                  //  _paint16.bitsShow(lsRect);
                    workerRect = it.celRect;
                }
                writeSelectorValue(it.object, SelectorCache.lsLeft, it.celRect.left);
                writeSelectorValue(it.object, SelectorCache.lsTop, it.celRect.top);
                writeSelectorValue(it.object, SelectorCache.lsRight, it.celRect.right);
                writeSelectorValue(it.object, SelectorCache.lsBottom, it.celRect.bottom);
                // may get used for debugging

        		GfxPorts.offsetRect(workerRect);

                Screen.updateRect(workerRect);                
                //_paint16.frameRect(workerRect);
                //_paint16.bitsShow(workerRect);
    
                if (it.signal & ViewSignals.Hidden)
                    it.signal |= ViewSignals.RemoveView;
            }
        }    
    }
    
    var restoreAndDelete = function(args) {
        // This has to be done in a separate loop. At least in sq1 some .dispose
        // modifies FIXEDLOOP flag in signal for another object. In that case we
        // would overwrite the new signal with our version of the old signal.
        for (it in animList) {
            // Finally update signal
            writeSelectorValue(animList[it].object, SelectorCache.signal, animList[it].signal);
        }
    
        for (x = animList.length - 1; x >= 0; x--) {
            var it = animList[x];
            // We read out signal here again, this is not by accident but to ensure
            // that we got an up-to-date signal
            it.signal = readSelectorValue(it.object, SelectorCache.signal);
    
            if ((it.signal & (ViewSignals.NoUpdate | ViewSignals.RemoveView)) == 0) {
                var rect = it.celRect.clone();
                GfxPorts.offsetRect(rect);
                GfxScreen.restorePic(rect);
                // Not sure about this one TODO
                //_paint16->bitsRestore(readSelector(_s->_segMan, it.object, SELECTOR(underBits)));
                //writeSelectorValue(_s->_segMan, it.object, SELECTOR(underBits), 0);
            }
    
            if ((it.signal & ViewSignals.DisposeMe) != 0) {
                // Call .delete_ method of that object
                var argv = VM.state.xs.sp + 1;
                invokeSelector(it.object, SelectorCache.delete_, args.length, argv, []);
            }
        }
    }
    
    var reAnimate = function(rect) {
        Debug.warn("reAnimate STUB");
    }
    
    var addToPicDrawCels = function() {
        Debug.warn("addToPicDrawCels STUB");
    }
    
	var addToPicDrawView = function(viewId, loopNo, celNo, leftPos, topPos, priority, control) {
        Debug.warn("addToPicDrawView STUB");
	}
	
	var throttleSpeed = function() {
	    // TODO
    }
    
    var animateShowPic = function() {
//        Debug.warn("STUB");
    }
	
	var kernelAnimate = function(listReference, cycle, args) {
        var old_picNotValid = GfxScreen.picNotValid;
	
        if (listReference.isNull()) {
            disposeLastCast();
            if (GfxScreen.picNotValid)
                animateShowPic();
            return;
        }
    
        var list = SegManager.lookupList(listReference);
        if (list == null)
            Debug.error("kAnimate called with non-list as parameter");
    
        if (cycle != 0) {
            if (!invoke(list, args))
                return;
    
            // Look up the list again, as it may have been modified
            list = SegManager.lookupList(listReference);
        }
    
        var oldPort = GfxPorts.setPort(GfxPorts.picWind());
        disposeLastCast();
    
        makeSortedList(list);
        old_picNotValid = fill(old_picNotValid);
    
        if (old_picNotValid) {
            // beginUpdate()/endUpdate() were introduced SCI1.
            // Calling those for SCI0 will work most of the time but breaks minor
            // stuff like percentage bar of qfg1ega at the character skill screen.
            if (getSciVersion() >= SciVersion.SCI_VERSION_1_EGA_ONLY) {
                GfxPorts.beginUpdate(GfxPorts.picWind());
            }
            update();
            if (getSciVersion() >= SciVersion.SCI_VERSION_1_EGA_ONLY) {
                GfxPorts.endUpdate(GfxPorts.picWind());
            }
        }
    
        GfxScreen.clearViews();
        drawCels();
    
        if (GfxScreen.picNotValid)
            animateShowPic();
            
    
        updateScreen(old_picNotValid);
        restoreAndDelete(args);
            
        // We update the screen here as well, some scenes like EQ1 credits run w/o calling kGetEvent thus we wouldn't update
        //  screen at all
        // TODO
        //g_sci->getEventManager()->updateScreen();
    
        // TODO
        GfxPorts.setPort(oldPort);
    
        // Now trigger speed throttler
        throttleSpeed();
	    
	}
	
	var kernelAddToPicList = function(listReference, args) {
        Debug.warn("kernelAddToPicList STUB");
	}
	
	var kernelAddToPicView = function(viewId, loopNo, celNo, leftPos, topPos, priority, control) {
        Debug.warn("kernelAddToPicView STUB");
	}

    return {
        init : init,
        disposeLastCast : disposeLastCast,
        invoke : invoke,
        makeSortedList : makeSortedList,
        applyGlobalScaling : applyGlobalScaling,
        fill : fill,
        update : update,
        drawCels : drawCels,
        updateScreen : updateScreen,
        restoreAndDelete : restoreAndDelete,
        reAnimate : reAnimate,
        addToPicDrawCels : addToPicDrawCels,
        addToPicDrawView : addToPicDrawView,
        kernelAnimate : kernelAnimate,
        kernelAddToPicList : kernelAddToPicList,
        kernelAddToPicView : kernelAddToPicView
    };
})();