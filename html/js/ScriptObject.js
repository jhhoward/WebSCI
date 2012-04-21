var ObjectOffsets = {
	LocalVariables : -6,
	FunctionArea : -4,
	SelectorCounter : -2,
	SelectorSegment : 0,
	InfoSelectorSci0 : 4,
	NamePointerSci0 : 6,
	InfoSelectorSci11 : 14,
	NamePointerSci11 : 16
};

var infoSelectorFlags = {
	kInfoFlagClone : 0x0001,
	kInfoFlagClass : 0x8000
};


function ScriptObject() {
    this.offset = getSciVersion() < SciVersion.SCI_VERSION_1_1 ? 0 : 5;
    this.flags = 0;
	this.baseObj = 0;
	this.baseVars = 0;
	this.methodCount = 0;
	this.propertyOffsetsSci3 = 0;
	this.variables = [];
	this.baseMethod = [];
}

ScriptObject.prototype = {
    copyFrom : function(other) {
        this.offset = other.offset;
        this.flags = other.flags;
        this.baseObj = other.baseObj;
        this.baseVars = other.baseVars;
        this.methodCount = other.methodCount;
        this.propertyOffsetsSci3 = other.propertyOffsetsSci3;
        
        for(x in other.variables) {
            this.variables[x] = other.variables[x].clone();
        }
        for(x in other.baseMethod) {
            this.baseMethod[x] = other.baseMethod[x];
        }
        this.pos = other.pos.clone();
    },

    allocVariables : function(numVariables) {
        this.variables = new Array(numVariables);
        for(var v = 0; v<numVariables; v++) {
            this.variables[v] = new Reg(0, 0);
        }
    },

    init : function(buf, objPos, initVariables) {
	    this.buf = buf;
	    this.baseObj = objPos.offset;
	    this.pos = objPos;

        if (getSciVersion() <= SciVersion.SCI_VERSION_1_LATE) {
            var numVariables = this.buf.getUint16LE(objPos.offset + ObjectOffsets.SelectorCounter);
            this.allocVariables(numVariables);
        
            this.baseVars = (this.baseObj + numVariables * 2);
            var funcOffsetArea = this.buf.getUint16LE(objPos.offset + ObjectOffsets.FunctionArea);
            this.methodCount = this.buf.getUint16LE(objPos.offset + funcOffsetArea - 2); 
            for (var i = 0; i < this.methodCount * 2 + 2; ++i) {
                this.baseMethod.push(this.buf.getUint16LE(objPos.offset + funcOffsetArea + i * 2));            
            }
        } 
        // TODO: later SCI versions
        /*else if (getSciVersion() >= SCI_VERSION_1_1 && getSciVersion() <= SCI_VERSION_2_1) {
            _variables.resize(READ_SCI11ENDIAN_UINT16(data + 2));
            _baseVars = (const uint16 *)(buf + READ_SCI11ENDIAN_UINT16(data + 4));
            _methodCount = READ_SCI11ENDIAN_UINT16(buf + READ_SCI11ENDIAN_UINT16(data + 6));
            for (int i = 0; i < _methodCount * 2 + 3; ++i) {
                _baseMethod.push_back(READ_SCI11ENDIAN_UINT16(buf + READ_SCI11ENDIAN_UINT16(data + 6) + i * 2));
            }
        } else if (getSciVersion() == SCI_VERSION_3) {
            initSelectorsSci3(buf);
        }*/
    
        if (initVariables) {
            if (getSciVersion() <= SciVersion.SCI_VERSION_2_1) {
                for (var i = 0; i < this.variables.length; i++) {
                    this.variables[i] = new Reg(0, this.buf.getUint16LE(objPos.offset + (i * 2)));
                    
                    if(i == 9)
                        Debug.log("ScriptObject", "Variable " + i + " = " + this.variables[i].offset);
                }
            } else {
                this.infoSelectorSci3 = new Reg(0, this.buf.getUint16LE(baseObj + 10));
            }
        }
    },
    
    locateVarSelector : function(slc) {
        var buf = this.buf;
        var ptr = 0;
        var varnum = 0;
    
        if (getSciVersion() <= SciVersion.SCI_VERSION_2_1) {
            var obj = this.getClass();
            varnum = getSciVersion() <= SciVersion.SCI_VERSION_1_LATE ? this.variables.length : obj.variables[1].toUint16();
            ptr = obj.baseVars;
            buf = obj.buf;
        } 
        else 
        if (getSciVersion() == SciVersion.SCI_VERSION_3) {
            varnum = this.variables.length;
            ptr = this.baseVars;
        }
    
        for (var i = 0; i < varnum; i++) {
//            if (READ_SCI11ENDIAN_UINT16(buf + (i << 1)) == slc) // Found it?
            if(buf.getUint16LE(ptr + (i << 1)) == slc)
                return i; // report success
        }
    
        return -1; // Failed
    },
    
    varToSelector : function(idx) {
        var buf = this.buf;
        var ptr = 0;
        var varnum = 0;
    
        if (getSciVersion() <= SciVersion.SCI_VERSION_2_1) {
            var obj = this.getClass();
            varnum = getSciVersion() <= SciVersion.SCI_VERSION_1_LATE ? this.variables.length : obj.variables[1].toUint16();
            ptr = obj.baseVars;
            buf = obj.buf;
        } 
        else 
        if (getSciVersion() == SciVersion.SCI_VERSION_3) {
            varnum = this.variables.length;
            ptr = this.baseVars;
        }

        return buf.getUint16LE(ptr + (idx << 1));        
    },

    getVarCount : function() {
        return this.variables.length;
    },
    
    getVariable : function(index) {
        return this.variables[index].clone();
    },

    getVariableRef : function(index) {
        return this.variables[index];
    },

	isClass : function() { 
	    return (this.getInfoSelector().offset & infoSelectorFlags.kInfoFlagClass) != 0; 
    },


    getClass : function() {
        return this.isClass() ? this : SegManager.getObject(this.getSuperClassSelector());
    },

    
	getSpeciesSelector : function()  {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			return this.variables[this.offset];
		else	// SCI3
			return this.speciesSelectorSci3;
	},

	setSpeciesSelector : function(value) {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			this.variables[this.offset] = value;
		else	// SCI3
			this.speciesSelectorSci3 = value;
	},
	
    getSuperClassSelector : function()  {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			return this.variables[this.offset + 1];
		else	// SCI3
			return this.superClassPosSci3;
	},

	setSuperClassSelector : function(value) {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			this.variables[this.offset + 1] = value;
		else	// SCI3
			this.superClassPosSci3 = value;
	},

    getInfoSelector : function()  {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			return this.variables[this.offset + 2];
		else	// SCI3
			return this.infoSelectorSci3;
	},

	setInfoSelector : function(value) {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			this.variables[this.offset + 2] = value;
		else	// SCI3
			this.infoSelectorSci3 = value;
	},

	getNameSelector : function() {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			return this.offset + 3 < this.variables.length ? this.variables[this.offset + 3] : new Reg(0, 0);
		else	// SCI3
			return this.variables.length > 0 ? this.variables[0] : new Reg(0, 0);
	},

    initSpecies : function(addr) {
	    var speciesOffset = this.getSpeciesSelector().offset;

        if (speciesOffset == 0xffff)		// -1
            this.setSpeciesSelector(new Reg(0, 0));	// no species
        else
            this.setSpeciesSelector(SegManager.getClassAddress(speciesOffset, ScriptLoadType.SCRIPT_GET_LOCK, addr).clone());
            
//        Debug.log("Species selector at addr " + addr.toString() + " is " + this.getSpeciesSelector().toString());
    },

    initSuperClass : function(addr) {
	    var superClassOffset = this.getSuperClassSelector().offset;

        if (superClassOffset == 0xffff)			// -1
            this.setSuperClassSelector(new Reg(0, 0));	// no superclass
        else
            this.setSuperClassSelector(SegManager.getClassAddress(superClassOffset, ScriptLoadType.SCRIPT_GET_LOCK, addr).clone());

//        Debug.log("Superclass selector at addr " + addr.toString() + " is " + this.getSuperClassSelector().toString());
    },

    initBaseObject : function(addr, doInitSuperClass) {
        if(typeof doInitSuperClass == 'undefined')
            doInitSuperClass = true;
    
        var baseObj = SegManager.getObject(this.getSpeciesSelector());
        
//        Debug.log("Base object for addr " + addr.toString() + ":");
//        Debug.log(baseObj);
    
        if (baseObj != null) {
            var originalVarCount = this.variables.length;
    
            if (this.variables.length != baseObj.variables.length)
            {
                // TODO
//                _variables.resize(baseObj->getVarCount());
                Debug.error("Variable lengths different");
            }
                
            // Copy base from species class, as we need its selector IDs
            baseObj = baseObj.baseObj;
            
            if (doInitSuperClass)
                this.initSuperClass(addr);
    
            if (this.variables.length != originalVarCount) {
                /*// These objects are probably broken.
                // An example is 'witchCage' in script 200 in KQ5 (#3034714),
                // but also 'girl' in script 216 and 'door' in script 22.
                // In LSL3 a number of sound objects trigger this right away.
                // SQ4-floppy's bug #3037938 also seems related.
    
                // The effect is that a number of its method selectors may be
                // treated as variable selectors, causing unpredictable effects.
                int objScript = segMan->getScript(_pos.segment)->getScriptNumber();
    
                // We have to do a little bit of work to get the name of the object
                // before any relocations are done.
                reg_t nameReg = getNameSelector();
                const char *name;
                if (nameReg.isNull()) {
                    name = "<no name>";
                } else {
                    nameReg.segment = _pos.segment;
                    name = segMan->derefString(nameReg);
                    if (!name)
                        name = "<invalid name>";
                }*/
    
            }
    
            return true;
        }
    
        return false;
    },
    
    getFunction : function(i) {
		var offset = (getSciVersion() < SciVersion.SCI_VERSION_1_1) ? this.methodCount + 1 + i : i * 2 + 2;
		if (getSciVersion() == SciVersion.SCI_VERSION_3)
			offset--;
		return new Reg(this.pos.segment, this.baseMethod[offset]);
	},

	getFuncSelector : function(i) {
		var offset = (getSciVersion() < SciVersion.SCI_VERSION_1_1) ? i : i * 2 + 1;
		if (getSciVersion() == SciVersion.SCI_VERSION_3)
			offset--;
		return this.baseMethod[offset];
	},
	
	funcSelectorPosition : function(sel) {
		for (var i = 0; i < this.methodCount; i++)
			if (this.getFuncSelector(i) == sel)
				return i;

		return -1;
	},
	
	relocateSci0Sci21 : function(segment, location, scriptSize) {
	    return relocateBlock(this.variables, this.pos.offset, segment, location, scriptSize);
	}
};