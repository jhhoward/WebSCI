function kScriptID(args) {
	var scriptNum = args[0].toUint16();
	var index = (args.length > 1) ? args[1].toUint16() : 0;

	if (args[0].segment != 0)
		return args[0].clone();

	var scriptSeg = SegManager.getScriptSegment(scriptNum);
	
	if(typeof scriptSeg == 'undefined') {
	    ResourceManager.loadScript(scriptNum);
	    throw VM_LOAD_STALL;
	}

	if (scriptSeg == 0)
		return new Reg(0, 0);

	var scr = SegManager.getScriptFromSegment(scriptSeg);

	if (scr.numExports == 0) {
		// This is normal. Some scripts don't have a dispatch (exports) table,
		// and this call is probably used to load them in memory, ignoring
		// the return value. If only one argument is passed, this call is done
		// only to load the script in memory. Thus, don't show any warning,
		// as no return value is expected. If an export is requested, then
		// it will most certainly fail with OOB access.
		if (args.length == 2)
			Debug.error("Script " + scriptNum + " does not have a dispatch table and export " + index + " was requested from it");
		return new Reg(0, 0);
	}

	if (index > scr.numExports) {
		Debug.error("Dispatch index too big: " + index + " > " + scr.numExports);
		return new Reg(0, 0);
	}

	var address = scr.validateExportFunc(index, true);

	// Point to the heap for SCI1.1 - SCI2.1 games
	if (getSciVersion() >= SciVersion.SCI_VERSION_1_1 && getSciVersion() <= SciVersion.SCI_VERSION_2_1)
		address += scr.getScriptSize();

	// Bugfix for the intro speed in PQ2 version 1.002.011.
	// This is taken from the patch by NewRisingSun(NRS) / Belzorash. Global 3
	// is used for timing during the intro, and in the problematic version it's
	// initialized to 0, whereas it's 6 in other versions. Thus, we assign it
	// to 6 here, fixing the speed of the introduction. Refer to bug #3102071.
	/*if (g_sci->getGameId() == GID_PQ2 && script == 200 &&
		s->variables[VAR_GLOBAL][3].isNull()) {
		s->variables[VAR_GLOBAL][3] = make_reg(0, 6);
	}*/

	return new Reg(scriptSeg, address);
}

function kIsObject(args) {
	if (args[0].offset == 0xFFFF) // Treated specially
		return new Reg(0, 0);
	else
		return new Reg(0, SegManager.isHeapObject(args[0]) ? 1 : 0);
}

function kClone(args) {
	var parentAddr = args[0];
	var parentObj = SegManager.getObject(parentAddr);
	var cloneAddr = new Reg(0, 0);
	var cloneObj;

	if (parentObj == null) {
		Debug.error("Attempt to clone non-object/class at " + parentAddr.toString() + "failed");
		return new Reg(0, 0);
	}

	Debug.log("KScripts", "Attempting to clone from " + parentAddr.toString());

	var infoSelector = parentObj.getInfoSelector().offset;
	cloneObj = SegManager.allocClone(cloneAddr);

	if (cloneObj == null) {
		Debug.error("Cloning " + parentAddr.toString() + "failed-- internal error");
		return new Reg(0, 0);
	}

	// In case the parent object is a clone itself we need to refresh our
	// pointer to it here. This is because calling allocateClone might
	// invalidate all pointers, references and iterators to data in the clones
	// segment.
	//
	// The reason why it might invalidate those is, that the segment code
	// (Table) uses Common::Array for internal storage. Common::Array now
	// might invalidate references to its contained data, when it has to
	// extend the internal storage size.
	if ((infoSelector & infoSelectorFlags.kInfoFlagClone) != 0)
		parentObj = SegManager.getObject(parentAddr);

    cloneObj.copyFrom(parentObj);

	// Mark as clone
	infoSelector &= ~infoSelectorFlags.kInfoFlagClass; // remove class bit
	cloneObj.setInfoSelector(new Reg(0, infoSelector | infoSelectorFlags.kInfoFlagClone));

	cloneObj.setSpeciesSelector(cloneObj.pos);
	if (parentObj.isClass())
		cloneObj.setSuperClassSelector(parentObj.pos);
		
//	s->_segMan->getScript(parentObj->getPos().segment)->incrementLockers();
	//s->_segMan->getScript(cloneObj->getPos().segment)->incrementLockers();

	return cloneAddr;
}

function kLoad(args) {
	var restype = args[0].toUint16() & 0x7f;
	var resnr = args[1].toUint16();

	// Request to dynamically allocate hunk memory for later use
	switch (restype) {
		case ResourceType.View:
		    if(ResourceManager.loadView(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
		case ResourceType.Cursor:
		    if(ResourceManager.loadCursor(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
		case ResourceType.Font:
		    if(ResourceManager.loadFont(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
		case ResourceType.Pic:
		    if(ResourceManager.loadPic(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
		case ResourceType.Script:
		    if(ResourceManager.loadScript(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
		case ResourceType.Text:
		    if(ResourceManager.loadText(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
	    case ResourceType.Memory:
		return SegManager.allocHunkEntry("kLoad()", resnr);
		
		default:
		    Debug.warn("Loading " + enumToString(ResourceType, restype) + "[" + restype + "] " + resnr);
		break;
    }

	return new Reg(0, ((restype << 11) | resnr)); // Return the resource identifier as handle

}
