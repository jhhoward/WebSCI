// window styles
var WindowStyle = {
	TRANSPARENT : (1 << 0),
	NOFRAME     : (1 << 1),
	TITLE       : (1 << 2),
	TOPMOST     : (1 << 3),
	USER        : (1 << 7)
};

var PORTS_FIRSTWINDOWID = 2;
var PORTS_FIRSTSCRIPTWINDOWID = 3;

function Port(id) {
	this.id = id;
	this.top = 0;
	this.left = 0;
	this.rect = new Rect();
	this.curTop = 0;
	this.curLeft = 0;
	this.fontHeight = 0;
	this.fontId = 0;
	this.greyedOutput = false;
	this.penClr = 0;
	this.backClr = 0xFF;
	this.penMode = 0;
	this.counterTillFree = 0;
};

Port.prototype = {
	isWindow : function() { return this.id >= PORTS_FIRSTWINDOWID && this.id != 0xFFFF; }
}

function Window(id) {
    var win = new Port(id);
    
    win.dims = new Rect();
    win.restoreRect = new Rect();
    win.wndStyle = 0;
    win.saveScreenMask = 0;
    win.hSaved1 = new Reg(0, 0);
    win.hSaved2 = new Reg(0, 0);
    win.title = "";
    win.drawn = false;
    return win;
}

var GfxPorts = (function() {
    // public
    var wmgrPort;
	var picWind;

	var menuPort;
	var menuBarRect;
	var menuRect;
	var menuLine;
	var curPort;    
    
    // private
    var windowList = [];

	/** The list of all open 'windows' (and ports), ordered by their id. */
	var windowsById = [];

	var usesOldGfxFunctions;

	var styleUser;

	// counts windows that got disposed but are not freed yet
	var freeCounter;

	var bounds = new Rect();

	// Priority Bands related variables
	var priorityTop, priorityBottom, priorityBandCount;
	var priorityBands = new Array(200);


	function reset() {}
	
	function kernelSetActive(portId) {}
	function kernelGetPicWindow(picTop, picLeft) {}
	function kernelSetPicWindow(rect, picTop, picLeft, initPriorityBandsFlag) {}
	function kernelGetActive() {}
	function kernelNewWindow(dims, restoreRect, style, priority, colorPen, colorBack, title) {}
	function kernelDisposeWindow(windowId, reanimate) {}

	function isFrontWindow(wnd) {}
	function beginUpdate(wnd) {}
	function endUpdate(wnd) {}
	
	function addWindow(dims, restoreRect, title, style, priority, draw) {
        var id = PORTS_FIRSTWINDOWID;
        while (id < windowsById.length && windowsById[id] != null) {
            if (windowsById[id].counterTillFree) {
                // port that is already disposed, but not freed yet
                freeWindow(windowsById[id]);
                freeCounter--;
                break; // reuse the handle
                // we do this especially for sq4cd. it creates and disposes the
                //  inventory window all the time, but reuses old handles as well
                //  this worked somewhat under the original interpreter, because
                //  it put the new window where the old was.
            }
            ++id;
        }
        
        if (id == windowsById.length)
            windowsById.push(null);
        
        var pwnd = new Window(id);
        var r = new Rect();
    
        windowsById[id] = pwnd;
    
        // KQ1sci, KQ4, iceman, QfG2 always add windows to the back of the list.
        // KQ5CD checks style.
        // Hoyle3-demo also always adds to the back (#3036763).
        var forceToBack = (getSciVersion() <= SciVersion.SCI_VERSION_1_EGA_ONLY);
//                           (g_sci->getGameId() == GID_HOYLE3 && g_sci->isDemo());
    
        if (!forceToBack && (style & WindowStyle.TOPMOST))
            windowList.unshift(pwnd);
        else
            windowList.push(pwnd);
        openPort(pwnd);
    
        r = dims.clone();
        // This looks fishy, but it's exactly what Sierra did. They removed last
        // bit of the left dimension in their interpreter. It seems Sierra did it
        // for EGA byte alignment (EGA uses 1 byte for 2 pixels) and left it in
        // their interpreter even in the newer VGA games.
        r.left = r.left & 0xFFFE;
    
        if (r.width() > Screen.width) {
            // We get invalid dimensions at least at the end of sq3 (script bug!).
            // Same happens very often in lsl5, sierra sci didnt fix it but it looked awful.
            // Also happens frequently in the demo of GK1.
            Debug.warn("Fixing too large window, left: " + dims.left + " right: "  + dims.right);
            r.left = 0;
            r.right = Screen.width - 1;
            if ((style != styleUser) && !(style & WindowStyle.NOFRAME))
                r.right--;
        }
        pwnd.rect = r.clone();
        if (restoreRect != null)
            pwnd.restoreRect = restoreRect.clone();
    
        pwnd.wndStyle = style;
        pwnd.hSaved1 = new Reg(0, 0);
        pwnd.hSaved2 = new Reg(0, 0);
        pwnd.drawn = false;
        if ((style & WindowStyle.TRANSPARENT) == 0)
            pwnd.saveScreenMask = (priority == -1 ? GfxScreenMasks.VISUAL : GfxScreenMasks.VISUAL | GfxScreenMasks.PRIORITY);
    
        if (title && (style & WindowStyle.TITLE)) {
            pwnd.title = title;
        }
    
        r = pwnd.rect.clone();
        if ((style != styleUser) && !(style & WindowStyle.NOFRAME)) {
            r.grow(1);
            if (style & WindowStyle.TITLE) {
                r.top -= 10;
                r.bottom++;
            }
        }
    
        pwnd.dims = r.clone();
    
        // Clip window, if needed
        var wmprect = new Rect();
        
        wmprect = wmgrPort.rect.clone();
        // Handle a special case for Dr. Brain 1 Mac. When hovering the mouse cursor
        // over the status line on top, the game scripts try to draw the game's icon
        // bar above the current port, by specifying a negative window top, so that
        // the end result will be drawn 10 pixels above the current port. This is a
        // hack by Sierra, and is only limited to user style windows. Normally, we
        // should not clip, same as what Sierra does. However, this will result in
        // having invalid rectangles with negative coordinates. For this reason, we
        // adjust the containing rectangle instead.
        /*if (pwnd->dims.top < 0 && g_sci->getPlatform() == Common::kPlatformMacintosh &&
            (style & WindowStyle.USER) && _wmgrPort->top + pwnd->dims.top >= 0) {
            // Offset the final rect top by the requested pixels
            wmprect.top += pwnd->dims.top;
        }*/
    
        var oldtop = pwnd.dims.top;
        var oldleft = pwnd.dims.left;
    
        if (wmprect.top > pwnd.dims.top)
            pwnd.dims.moveTo(pwnd.dims.left, wmprect.top);
    
        if (wmprect.bottom < pwnd.dims.bottom)
            pwnd.dims.moveTo(pwnd.dims.left, wmprect.bottom - pwnd.dims.bottom + pwnd.dims.top);
    
        if (wmprect.right < pwnd.dims.right)
            pwnd.dims.moveTo(wmprect.right + pwnd.dims.left - pwnd.dims.right, pwnd.dims.top);
    
        if (wmprect.left > pwnd.dims.left)
            pwnd.dims.moveTo(wmprect.left, pwnd.dims.top);
    
        pwnd.rect.moveTo(pwnd.rect.left + pwnd.dims.left - oldleft, pwnd.rect.top + pwnd.dims.top - oldtop);
    
        if (restoreRect == null)
            pwnd.restoreRect = pwnd.dims.clone();
    
/*        if (pwnd.restoreRect.top < 0 && g_sci->getPlatform() == Common::kPlatformMacintosh &&
            (style & WindowStyle.USER) && _wmgrPort->top + pwnd->restoreRect.top >= 0) {
            // Special case for Dr. Brain 1 Mac (check above), applied to the
            // restore rectangle.
            pwnd->restoreRect.moveTo(pwnd->restoreRect.left, wmprect.top);
        }*/
    
        if (draw)
            drawWindow(pwnd);
        setPort(pwnd);
    
        // All SCI0 games till kq4 .502 (not including) did not adjust against _wmgrPort, we set _wmgrPort->top to 0 in that case
        setOrigin(pwnd.rect.left, pwnd.rect.top + wmgrPort.top);
        pwnd.rect.moveTo(0, 0);
        return pwnd;
	
	}
	
	function drawWindow(wnd) {}
	function removeWindow(wnd, reanimate) {}
	function freeWindow(wnd) {}
	function updateWindow(wnd) {}

	function getPortById(id) {}

	function setPort(newPort) {
        var oldPort = curPort;
        curPort = newPort;
        return oldPort;
	}
	
	function getPort() {
		return curPort;
	}
	
	function setOrigin(left, top) {
		curPort.left = left;
		curPort.top = top;
	}
	
	function moveTo(left, top) {}
	function move(left, top) {}
	
	function openPort(port) {
        port.fontId = 0;
        port.fontHeight = 8;
    
        var tmp = curPort;
        curPort = port;
        // TODO
        GfxText.setFont(port.fontId);
        curPort = tmp;
    
        port.top = 0;
        port.left = 0;
        port.greyedOutput = false;
        port.penClr = 0;
        port.backClr = 16; //_screen->getColorWhite();
        port.penMode = 0;
        port.rect = bounds.clone();
	}
	
	function penColor(color) {}
	function backColor(color) {}
	function penMode(mode) {}
	function textGreyedOutput(state) {}
	function getPointSize() {}

	function offsetRect(r) {
		r.top += curPort.top;
		r.bottom += curPort.top;
		r.left += curPort.left;
		r.right += curPort.left;
	}
	
	function offsetLine(start, end) {}
	function clipLine(start, end) {}

	function priorityBandsInit(bandCount, top, bottom) {
        var y;
        var bandSize;
    
        if (bandCount != -1)
            priorityBandCount = bandCount;
    
        priorityTop = top;
        priorityBottom = bottom;
    
        // Do NOT modify this algo or optimize it anyhow, sierra sci used int32 for calculating the
        //  priority bands and by using double or anything rounding WILL destroy the result
        bandSize = ((priorityBottom - priorityTop) * 2000) / priorityBandCount;
    
    	for(var n = 0; n<priorityTop; n++) {
    		priorityBands[n] = 0;
    	}

        for (y = priorityTop; y < priorityBottom; y++)
            priorityBands[y] = parseInt(1 + (((y - priorityTop) * 2000) / bandSize));
            
        if (priorityBandCount == 15) {
            // When having 15 priority bands, we actually replace band 15 with band 14, cause the original sci interpreter also
            //  does it that way as well
            y = priorityBottom;
            while (priorityBands[--y] == priorityBandCount)
                priorityBands[y]--;
        }
        // We fill space that is left over with the highest band (hardcoded 200 limit, because this algo isnt meant to be used on hires)
        for (y = priorityBottom; y < 200; y++)
            priorityBands[y] = priorityBandCount;
    
        // adjust, if bottom is 200 (one over the actual screen range) - we could otherwise go possible out of bounds
        //  sierra sci also adjust accordingly
        if (priorityBottom == 200)
            priorityBottom--;	    
	}
	
	function priorityBandsInitSci11(data) {}

	function kernelInitPriorityBands() {
        if (usesOldGfxFunctions) {
            priorityBandsInit(15, 42, 200);
        } 
        else {
            if (getSciVersion() >= SciVersion.SCI_VERSION_1_1)
                priorityBandsInit(14, 0, 190);
            else
                priorityBandsInit(14, 42, 190);
        }
	}
	
	function kernelGraphAdjustPriority(top, bottom) {}
	
	function kernelCoordinateToPriority(y) {
		if (y < priorityTop)
            return priorityBands[priorityTop];
        if (y > priorityBottom)
            return priorityBands[priorityBottom];
        return priorityBands[y];
	}
	
	function kernelPriorityToCoordinate(priority) {
        var y;
        if (priority <= priorityBandCount) {
            for (y = 0; y <= priorityBottom; y++)
                if (priorityBands[y] == priority)
                    return y;
        }
        return priorityBottom;
	}
	
	function processEngineHunkList(wm) {}

    var init = function() {
        var offTop = 10;
    
        usesOldGfxFunctions = GameFeatures.usesOldGfxFunctions();
    
        freeCounter = 0;
    
        // _menuPort has actually hardcoded id 0xFFFF. Its not meant to be known to windowmanager according to sierra sci
        menuPort = new Port(0xFFFF);
        openPort(menuPort);
        setPort(menuPort);
        GfxText.setFont(0);
        menuPort.rect = new Rect(0, 0, Screen.width, Screen.height);
        menuBarRect = new Rect(0, 0, Screen.width, 9);
        menuRect = new Rect(0, 0, Screen.width, 10);
        menuLine = new Rect(0, 9, Screen.width, 10);
    
        wmgrPort = new Port(1);
        windowsById[0] = wmgrPort; // wmgrPort is supposed to be accessible via id 0
        windowsById[1] = wmgrPort; //  but wmgrPort may not actually have id 0, so we assign id 1 (as well)
        // Background: sierra sci replies with the offset of curPort on kGetPort calls. If we reply with 0 there most games
        //				will work, but some scripts seem to check for 0 and initialize the variable again in that case
        //				resulting in problems.
    
        if (getSciVersion() >= SciVersion.SCI_VERSION_1_LATE)
            styleUser = WindowStyle.USER;
        else
            styleUser = WindowStyle.USER | WindowStyle.TRANSPARENT;
    
        // Jones, Slater, Hoyle 3&4 and Crazy Nicks Laura Bow/Kings Quest were
        // called with parameter -Nw 0 0 200 320.
        // Mother Goose (SCI1) uses -Nw 0 0 159 262. The game will later use
        // SetPort so we don't need to set the other fields.
        // This actually meant not skipping the first 10 pixellines in windowMgrPort
        /*switch (g_sci->getGameId()) {
        case GID_JONES:
        case GID_SLATER:
        case GID_HOYLE3:
        case GID_HOYLE4:
        case GID_CNICK_LAURABOW:
        case GID_CNICK_KQ:
            offTop = 0;
            break;
        case GID_MOTHERGOOSE256:
            // only the SCI1 and SCI1.1 (VGA) versions need this
            offTop = 0;
            break;
        case GID_FAIRYTALES:
            // Mixed-Up Fairy Tales (& its demo) uses -w 26 0 200 320. If we don't
            // also do this we will get not-fully-removed windows everywhere.
            offTop = 26;
            break;
        default:
            // For Mac games running with a height of 190, we do not have a menu bar
            // so the top offset should be 0.
            if (_screen->getHeight() == 190)
                offTop = 0;
            break;
        }*/
        
    
        openPort(wmgrPort);
        setPort(wmgrPort);
        // SCI0 games till kq4 (.502 - not including) did not adjust against _wmgrPort in kNewWindow
        //  We leave _wmgrPort top at 0, so the adjustment wont get done
        if (GameFeatures.usesOldGfxFunctions()) {
            setOrigin(0, offTop);
            wmgrPort.rect.bottom = Screen.height - offTop;
        } else {
            wmgrPort.rect.bottom = Screen.height;
        }
        wmgrPort.rect.right = Screen.width;
        wmgrPort.rect.moveTo(0, 0);
        wmgrPort.curTop = 0;
        wmgrPort.curLeft = 0;
        windowList.push(wmgrPort);
    
        picWind = addWindow(new Rect(0, offTop, Screen.width, Screen.height), null, "", WindowStyle.TRANSPARENT | WindowStyle.NOFRAME, 0, true);
        // For SCI0 games till kq4 (.502 - not including) we set _picWind top to offTop instead
        //  Because of the menu/status bar
        if (GameFeatures.usesOldGfxFunctions())
            picWind.top = offTop;
    
        kernelInitPriorityBands();    
	}
	
    

    return {
    	init : init,
    	kernelCoordinateToPriority : kernelCoordinateToPriority,
    	
    	setPort : setPort,
    	getPort : getPort,
    	picWind : function() { return picWind; },
    	offsetRect : offsetRect
    };
})();
