var Engine = (function() {

    var internalTicker = 0;
    var startTime = 0;
    var gameObjectAddress = new Reg(0, 3540);
    
    function initStackBaseWithSelector(selector) {
        VM.state.stack[VM.state.stackBase] = new Reg(0, selector);
        VM.state.stack[VM.state.stackBase + 1] = new Reg(0, 0); // NULL_REG;
    
        // Register the first element on the execution stack
        if (sendSelector(gameObjectAddress, gameObjectAddress, VM.state.stackBase, 2, VM.state.stackBase) == null) {
            Debug.error("initStackBaseWithSelector: error while registering the first selector in the call stack");
        }
        
    }
    
    // Should really be in VMState
    var initGlobals = function() {
        var script_000 = SegManager.getScriptFromSegment(1);
    
        if (script_000.localsCount == 0)
            Debug.error("Script 0 has no locals block");
    
        VM.state.variablesSegment[VariableTypes.VAR_GLOBAL] = script_000.getLocalsSegment();
        VM.state.variablesBase[VariableTypes.VAR_GLOBAL] = script_000.getLocalsBegin();
        VM.state.variables[VariableTypes.VAR_GLOBAL] = script_000.getLocalsBegin();
        VM.state.variablesMax[VariableTypes.VAR_GLOBAL] = script_000.localsCount;
    }
    
    var init = function() {
        internalTicker = 0;
        startTime = new Date().getTime();
        
        Screen.init();
        Input.init();
        Kernel.init();
        VM.init();
        SegManager.init();
        GfxScreen.init();
        GfxAnimate.init();
        GfxPorts.init();
        GfxText.init();
        loadSelectorNames();
        
        FileLoader.onLoadingFinished.addOnce(function() {
            ResourceManager.loadScript(0); 

            FileLoader.onLoadingFinished.addOnce(function() {
                initGlobals();
                SegManager.initSysStrings();
                gameObjectAddress = findGameObject(true);
                initStackBaseWithSelector(SelectorCache.play);
                VM.run();
            });
        });
    }
    
    var update = function() {
        if(FileLoader.finishedLoading() == true) {
            VM.update();
            internalTicker ++;
        }
        
        GfxScreen.render();
        Screen.render();
    }
    
    var getTimeMS = function() {
        //return parseInt(internalTicker * 1000 / 60);
        return (new Date().getTime()) - startTime;
    }
    
    var getTicks = function() {
//        return parseInt(((new Date().getTime()) - startTime) * 1000 / 1000);
        return parseInt(((new Date().getTime()) - startTime) * 60 / 1000);
//        return internalTicker;
    }
    
    return {
        init : init,
        update : update,
        
        getTicks : getTicks,
        getTimeMS : getTimeMS
    };
})();

function findGameObject(addSci11ScriptOffset) {
    var script = SegManager.getSegment(SegManager.getScriptSegment(0), SegmentType.SEG_TYPE_SCRIPT);
    
	if (script == null)
		return NULL_REG.clone();

	var offsetPtr = 0;

	if (getSciVersion() <= SciVersion.SCI_VERSION_1_LATE) {
	    var exportAddr = script.getExportAddress(0);

		return new Reg(script.segmentId, exportAddr);
	} 
	
	return null;
	/*else if (getSciVersion() >= SCI_VERSION_1_1 && getSciVersion() <= SCI_VERSION_2_1) {
		offsetPtr = script->data + 4 + 2 + 2;

		// In SCI1.1 - SCI2.1, the heap is appended at the end of the script,
		// so adjust the offset accordingly if requested
		int16 offset = !isSci11Mac() ? READ_LE_UINT16(offsetPtr) : READ_BE_UINT16(offsetPtr);
		if (addSci11ScriptOffset) {
			offset += script->size;

			// Ensure that the start of the heap is word-aligned - same as in Script::init()
			if (script->size & 2)
				offset++;
		}

		return make_reg(1, offset);
	} else {
		return make_reg(1, relocateOffsetSci3(script->data, 22));
	}*/
}
