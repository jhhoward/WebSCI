// VM Types 

var VariableTypes = {
	VAR_GLOBAL : 0,
	VAR_LOCAL : 1,
	VAR_TEMP : 2,
	VAR_PARAM : 3
};

function StringPtr(str) {
    this.str = str;
    this.isRaw = true;
}

StringPtr.prototype = {
    getChar : function(x) {
        return this.str.charCodeAt(x);
    },
    
    setChar : function(x, y) {
        this.str = this.str.substr(0, x) + String.fromCharCode(y) + str.substr(x+1);
    }
};

function ArrayPtr(array, index) {
    this.array = array;
    this.index = index;
}

ArrayPtr.prototype = {
    getValue : function(x) {
        if(typeof x == 'undefined')
            return this.array[this.index];
        else
            return this.array[this.index + x];
    },
    
    setValue : function(x, y) {
        if(typeof y == 'undefined')
            this.array[this.index] = x;
        else
            this.array[this.index + x] = y;
    }
};

function ObjVarRef() {
    this.obj = new Reg(0, 0);
    this.varIndex = 0;
}

ObjVarRef.prototype = {
    getPointer : function() {
        var o = SegManager.getObject(this.obj);
        if(o != null) {
            return o.getVariableRef(this.varIndex);
        }
        return null;
    },
    
    clone : function() {
        var cloned = new ObjVarRef();
        cloned.obj = this.obj.clone();
        cloned.varIndex = this.varIndex;
        return cloned;
    }
};

var Reg = function(segment, offset) {
    this.segment = segment ;
    this.offset = offset & 0xFFFF;
}

var NULL_REG = new Reg(0, 0);
var SIGNAL_REG = new Reg(0, 0xffff);
var TRUE_REG = new Reg(0, 1);

function lookForWorkaround(reg) {
    Debug.error("Not implemented (workaround)");
}

var SIGN_EXTENSION_8_MASK = 1 << 7;
var SIGN_EXTENSION_16_MASK = 1 << 15;

Reg.prototype = {
    toString : function() {
        return this.segment.toString() + ":0x" + this.offset.toString(16);
    },

    clone : function() {
        return new Reg(this.segment, this.offset);
    },
    
    set : function(other) {
        this.segment = other.segment;
        this.offset = other.offset;
    },

    isNull : function() {
        return (this.offset | this.segment) == 0;
    },
    
    toUint16 : function() {
        return this.offset & 0xFFFF;
    },

    toSint16 : function() {
/*        if((this.offset & 0x8000) != 0) {
           return -1 * ( (~(this.offset - 1)) & 0xFFFF);
        }
        return this.offset;*/
        return (this.offset ^ SIGN_EXTENSION_16_MASK) - SIGN_EXTENSION_16_MASK;
    },

	isNumber : function() {
		return this.segment == 0;
	},

	isPointer : function() {
		return this.segment != 0 && this.segment != 0xFFFF;
	},    

    requireUint16 : function() {
        if(this.isNumber()) {
            return this.toUint16();
        }
        else {
            return lookForWorkaround(NULL_REG).toUint16();
        }
    },

    requireSint16 : function() {
        if(this.isNumber()) {
            return this.toSint16();
        }
        else {
            return lookForWorkaround(NULL_REG).toSint16();
        }
    },
    
    
	isInitialized : function() {
		return this.segment != 0xFFFF;
	},
	
    // comparison
	equals : function(x) {
		return (this.offset == x.offset) && (this.segment == x.segment);
	},

	notEqual : function(x) {
		return (this.offset != x.offset) || (this.segment != x.segment);
	},

	greaterThan : function(right)  {
		return this.cmp(right, false) > 0;
	},

	greaterEqual : function (right) {
		return this.cmp(right, false) >= 0;
	},

	lessThan : function (right) {
		return this.cmp(right, false) < 0;
	},

	lessEqual : function(right) {
		return this.cmp(right, false) <= 0;
	},
	
	// Unsigned comparison
	greaterThanU : function(right)  {
		return this.cmp(right, true) > 0;
	},

	greaterEqualU : function (right) {
		return this.cmp(right, true) >= 0;
	},

	lessThanU : function (right) {
		return this.cmp(right, true) < 0;
	},

	lessEqualU : function(right) {
		return this.cmp(right, true) <= 0;
	},

    cmp : function(right, treatAsUnsigned) {
        if (this.segment == right.segment) { // can compare things in the same segment
            if (treatAsUnsigned || !this.isNumber())
                return this.toUint16() - right.toUint16();
            else
                return this.toSint16() - right.toSint16();
        } 
        else if (this.pointerComparisonWithInteger(right)) {
            return 1;
        } 
        else if (right.pointerComparisonWithInteger(this)) {
            return -1;
        } 
        else {
		    return lookForWorkaround(right).toSint16();    
		}
    },
    
    pointerComparisonWithInteger : function(right) {
    	return (this.isPointer() && right.isNumber() && right.offset <= 2000); // && getSciVersion() <= SCI_VERSION_1_1);
    },

    // Bitwise operators
    bitwiseAnd : function(right) {
        if(this.isNumber() && right.isNumber()) {
            return new Reg(0, this.toUint16() & right.toUint16());
        }
        else {
            return lookForWorkaround(right);
        }
    },
    
    bitwiseOr : function(right) {
        if(this.isNumber() && right.isNumber()) {
            return new Reg(0, this.toUint16() | right.toUint16());
        }
        else {
            return lookForWorkaround(right);
        }
    },

    bitwiseXor : function(right) {
        if(this.isNumber() && right.isNumber()) {
            return new Reg(0, this.toUint16() ^ right.toUint16());
        }
        else {
            return lookForWorkaround(right);
        }
    },
    
	// Arithmetic operators
	add : function(right) {
	    if(typeof(right) == "number") {
	        return this.add(new Reg(0, right));
	    }
	
	    if(this.isPointer() && right.isNumber()) {
            // Pointer arithmetics. Only some pointer types make sense here
            var mobj = SegManager.getSegmentObj(this.segment);
    
            if (mobj == null)
                Debug.error("[VM]: Attempt to add to invalid pointer " + this.toString());
    
            switch (mobj.segmentType) {
            case SegmentType.SEG_TYPE_LOCALS:
            case SegmentType.SEG_TYPE_SCRIPT:
            case SegmentType.SEG_TYPE_STACK:
            case SegmentType.SEG_TYPE_DYNMEM:
                return new Reg(this.segment, this.offset + right.toSint16());
            default:
                return lookForWorkaround(right);
            }
	    }
	    else if(this.isNumber() && right.isPointer()) {
	        return right.add(this);
	    }
	    if(this.isNumber() && right.isNumber()) {
	        return new Reg(0, this.toSint16() + right.toSint16());
	    }
	    else {
	        lookForWorkaround(right);
	    }
	    
	    return this;
	},
	
	subtract : function(right) {
	    if(typeof(right) == "number") {
	        return this.subtract(new Reg(0, right));
	    }
	    
	    if(this.segment == right.segment) {
	        return new Reg(0, this.toSint16() - right.toSint16());
	    }
	    else {
	        return this.add(new Reg(right.segment, -right.offset));
	    }
	},
	
	increment : function(right) {
	    var result = this.add(right);
		this.segment = result.segment;
		this.offset = result.offset;
	},
	
	decrement : function(right) {
	    var result = this.subtract(right);
		this.segment = result.segment;
		this.offset = result.offset;
	},
	
	multiply : function(right) {
	    if(this.isNumber() && right.isNumber()) {
	        return new Reg(0, this.toSint16() * right.toSint16());
	    }
	    else {
	        lookForWorkaround(right);
	    }
	},
	
	divide : function(right) {
	    if(this.isNumber() && right.isNumber()) {
	        return new Reg(0, parseInt(this.toSint16() / right.toSint16()));
	    }
	    else {
	        lookForWorkaround(right);
	    }
	},
	
	modulo : function(right) {
        if(this.isNumber() && right.isNumber() && !right.isNull()) {
            // Support for negative numbers was added in Iceman, and perhaps in
            // SCI0 0.000.685 and later. Theoretically, this wasn't really used
            // in SCI0, so the result is probably unpredictable. Such a case
            // would indicate either a script bug, or a modulo on an unsigned
            // integer larger than 32767. In any case, such a case should be
            // investigated, instead of being silently accepted.
            //if (getSciVersion() <= SCI_VERSION_0_LATE && (toSint16() < 0 || right.toSint16() < 0))
              //  warning("Modulo of a negative number has been requested for SCI0. This *could* lead to issues");
            var value = this.toSint16();
            var modulo = Math.abs(right.toSint16());
            var result = value % modulo;
            if (result < 0)
                result += modulo;
            return new Reg(0, result);
        } 
        else {
            return lookForWorkaround(right);	    
        }
	},
	
	shiftRight : function(right) {
        if(this.isNumber() && right.isNumber())
            return new Reg(0, this.toUint16() >> right.toUint16());
        else
            return lookForWorkaround(right);
    },

	shiftLeft : function(right) {
        if(this.isNumber() && right.isNumber())
            return new Reg(0, this.toUint16() << right.toUint16());
        else
            return lookForWorkaround(right);
    }
    
}

