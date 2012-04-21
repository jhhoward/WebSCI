var debugReg = null;
var maxCycles = 10000000;
var cyclesPerFrame = 5000;

var ExecStackType = {
	EXEC_STACK_TYPE_CALL : 0,
	EXEC_STACK_TYPE_KERNEL : 1,
	EXEC_STACK_TYPE_VARSELECTOR : 2
};

function ExecStack(objp, sendp, sp, argc, argp, localsSegment, pc, 
                    debugSelector, debugExportId, debugLocalCallOffset, debugOrigin, type) {
    this.objp = objp.clone();
    this.sendp = sendp.clone();
    this.pc = pc.clone();
    this.varp = new ObjVarRef();
    
    this.fp = sp;
    this.sp = sp;
    
    this.argc = argc;
    this.variablesArgp = argp;
    
    VM.state.stack[argp] = new Reg(0, argc);
    
    if (localsSegment != 0xFFFF)
        this.localSegment = localsSegment;
    else
        this.localSegment = pc.segment;
    
    this.debugSelector = debugSelector;
    this.debugExportId = debugExportId;
    this.debugLocalCallOffset = debugLocalCallOffset;
    this.debugOrigin = debugOrigin;
    this.type = type;
}

ExecStack.prototype = {
    getVarPointer : function() {
        if(this.type != ExecStackType.EXEC_STACK_TYPE_VARSELECTOR) {
            Debug.warn("This exec stack is not a var selector!");
        }
        return this.varp.getPointer();
    }
};

function VMState() {
    this.acc = new Reg(0, 0);
    this.prev = new Reg(0, 0);
    this.rest = 0;
    
    this.executionStackPosChanged = false;
    this.executionStackBase = 0;
    this.executionStack = [];
    this.xs;
    
    this.variables = [null, null, null, null];		///< global, local, temp, param, as immediate pointers
	this.variablesBase = [null, null, null, null];	///< Used for referencing VM ops
	this.variablesSegment = [0, 0, 0, 0];	///< Same as above, contains segment IDs
	this.variablesMax = [0, 0, 0, 0];		///< Max. values for all variables
    
    this.stack = [];
    this.stackBase = 0;
    this.stackTop = 0;
    
    this.waitTicks = 0;
    this.lastWaitTime = 0;
}

VMState.prototype = {
    wait : function(ticks) {
        var gameTicks = Engine.getTicks();
        this.acc = new Reg(0, gameTicks - this.lastWaitTime);
        this.lastWaitTime = gameTicks;
        this.waitTicks = ticks;
    }
};

var VM = (function() {
    var VM_STACK_SIZE = 0x1000;
    var NULL_SELECTOR = -1;
    
    var state = new VMState();
    var mainRunFunction = null;
    
    var reset = function() {
    };

    var push32 = function(x) {
        Debug.log("VM", "Pushing " + x.toString() + " at pc " + state.xs.pc.offset);
        state.stack[state.xs.sp] = x.clone();
        state.xs.sp ++;
        validateStackAddr(state.xs.sp);
        return x;
    }

    var push = function(x) {
        push32(new Reg(0, x));
    }
    
    var pop32 = function() {
        state.xs.sp --;
        validateStackAddr(state.xs.sp);
        //Debug.log("Popping " + state.stack[state.xs.sp].toString() + " at pc " + state.xs.pc.offset);
        return state.stack[state.xs.sp].clone();
    }
    
    var validateStackAddr = function(sp) {
        //VM.dumpStack();
/*        for(x in state.stack) {
            if(typeof state.stack[x].segment != 'number') {
                Debug.error("Oh noes!");
            }
        }*/
        
        if(sp >= state.stackBase && sp < state.stackTop) {
            return sp;
        }
        else {
            Debug.error("Invalid stack address!");
            return 0;
        }
    };
    
    var addKernelCallToExecStack = function(kernelCallNr, argc, argv) {
        // Add stack frame to indicate we're executing a callk.
        // This is useful in debugger backtraces if this
        // kernel function calls a script itself.
        var nullReg = new Reg(0, 0);
        
        var xstack = new ExecStack(nullReg, nullReg, null, argc, argv - 1, 0xFFFF, nullReg,
                            kernelCallNr, -1, -1, state.executionStack.length - 1, ExecStackType.EXEC_STACK_TYPE_KERNEL);
        state.executionStack.push(xstack);
    }


    var callKernelFunc = function(kernelCallNr, argc) {
        if (kernelCallNr >= Kernel.kernelFuncs.length)
            Debug.error("Invalid kernel function 0x" + kernelCallNr.toString(16) + " requested");
    
        var kernelCall = Kernel.kernelFuncs[kernelCallNr];
        
        var args = [];
        var argv = state.xs.sp + 1;
        
        for(var arg = 0; arg<argc; arg++) {
            args.push(state.stack[state.xs.sp + 1 + arg]);
        }
    
        // TODO: check signatures, workarounds
/*        if (kernelCall.signature
                && !kernel->signatureMatch(kernelCall.signature, argc, argv)) {
            // signature mismatch, check if a workaround is available
            SciTrackOriginReply originReply;
            SciWorkaroundSolution solution = trackOriginAndFindWorkaround(0, kernelCall.workarounds, &originReply);
            switch (solution.type) {
            case WORKAROUND_NONE:
                kernel->signatureDebug(kernelCall.signature, argc, argv);
                error("[VM] k%s[%x]: signature mismatch via method %s::%s (room %d, script %d, localCall 0x%x)",
                    kernelCall.name, kernelCallNr, originReply.objectName.c_str(), originReply.methodName.c_str(),
                    s->currentRoomNumber(), originReply.scriptNr, originReply.localCallOffset);
                break;
            case WORKAROUND_IGNORE: // don't do kernel call, leave acc alone
                return;
            case WORKAROUND_STILLCALL: // call kernel anyway
                break;
            case WORKAROUND_FAKE: // don't do kernel call, fake acc
                s->r_acc = make_reg(0, solution.value);
                return;
            default:
                error("unknown workaround type");
            }
        }*/
    
    
        // Call kernel function
        if (kernelCall.subFunctions.length == 0) {
            addKernelCallToExecStack(kernelCallNr, argc, argv);
            Debug.log("VMKF", "[VM] Calling kernel function " + Kernel.getKernelFuncName(kernelCallNr));
            try {
                var funcOutput = kernelCall.func(args);
            }
            catch(exception) {
                if(exception == VM_LOAD_STALL) {
                    if (state.executionStack.length > 1)
                        state.executionStack.pop();
                }
                throw exception;
            }
            state.acc = funcOutput;
            Debug.log("VMKF", "[VM] Result = " + state.acc.toString());
        } else {
            // Sub-functions available, check signature and call that one directly
            if (argc < 1)
                Debug.error("[VM] " + kernelCall.name + " no subfunction ID parameter given");
            if (args[0].isPointer())
                Debug.error("[VM] " + kernelCall.name + " : given subfunction ID is actually a pointer");
            var subId = args[0].toUint16();
            // Skip over subfunction-id
            argc--;
            args.shift();
            argv++;
            if (subId >= kernelCall.subFunctions.length)
                Debug.error("[VM] " + kernelCall.name + " : subfunction ID " + subId + " requested, but not available");
            var kernelSubCall = kernelCall.subFunctions[subId];
            /*
                TODO: workarounds and signature check
            if (kernelSubCall.signature && !kernel->signatureMatch(kernelSubCall.signature, argc, argv)) {
                // Signature mismatch
                SciTrackOriginReply originReply;
                SciWorkaroundSolution solution = trackOriginAndFindWorkaround(0, kernelSubCall.workarounds, &originReply);
                switch (solution.type) {
                case WORKAROUND_NONE: {
                    kernel->signatureDebug(kernelSubCall.signature, argc, argv);
                    int callNameLen = strlen(kernelCall.name);
                    if (strncmp(kernelCall.name, kernelSubCall.name, callNameLen) == 0) {
                        const char *subCallName = kernelSubCall.name + callNameLen;
                        error("[VM] k%s(%s): signature mismatch via method %s::%s (room %d, script %d, localCall %x)",
                            kernelCall.name, subCallName, originReply.objectName.c_str(), originReply.methodName.c_str(),
                            s->currentRoomNumber(), originReply.scriptNr, originReply.localCallOffset);
                    }
                    error("[VM] k%s: signature mismatch via method %s::%s (room %d, script %d, localCall %x)",
                        kernelSubCall.name, originReply.objectName.c_str(), originReply.methodName.c_str(),
                        s->currentRoomNumber(), originReply.scriptNr, originReply.localCallOffset);
                    break;
                }
                case WORKAROUND_IGNORE: // don't do kernel call, leave acc alone
                    return;
                case WORKAROUND_STILLCALL: // call kernel anyway
                    break;
                case WORKAROUND_FAKE: // don't do kernel call, fake acc
                    s->r_acc = make_reg(0, solution.value);
                    return;
                default:
                    error("unknown workaround type");
                }
            }*/
            if (kernelSubCall.func == null)
                Debug.error("[VM] " + kernelCall.name + " : subfunction ID " + subId + " requested, but not available");
            addKernelCallToExecStack(kernelCallNr, argc, argv);
            Debug.log("VMKF", "[VM] Calling kernel function " + Kernel.getKernelFuncName(kernelCallNr) + " sub function " + subId);
            try {
                var funcOutput = kernelSubCall.func(args);
            }
            catch(exception) {
                if(exception == VM_LOAD_STALL) {
                    if (state.executionStack.length > 1)
                        state.executionStack.pop();
                }
                throw exception;
            }
            state.acc = funcOutput;
            Debug.log("VMKF", "[VM] Result = " + state.acc.toString());

        }
    
        // Remove callk stack frame again, if there's still an execution stack
        if (state.executionStack.length > 1)
            state.executionStack.pop();
            
        return 0;
    }

    //ExecStack *execute_method(EngineState *s, uint16 script, uint16 pubfunct, StackPtr sp, reg_t calling_obj, uint16 argc, StackPtr argp) {
    
    var executeMethod = function(scriptNum, pubFunct, sp, callingObj, argc, argp) {
        
        if(!SegManager.isScriptLoaded(scriptNum)) {
            ResourceManager.loadScript(scriptNum, true);
            throw VM_LOAD_STALL;
        }
        
	    var seg = SegManager.getScriptSegment(scriptNum);
	    var scr = SegManager.getScriptFromSegment(seg);

        scr.init();

        // TODO
/*        if (!scr || scr->isMarkedAsDeleted()) { // Script not present yet?
            seg = s->_segMan->instantiateScript(script);
            scr = s->_segMan->getScript(seg);
        }*/

        var temp = scr.validateExportFunc(pubFunct, false);

        if (getSciVersion() == SciVersion.SCI_VERSION_3)
            temp += scr.getCodeBlockOffset();

        if (!temp) {
            Debug.error("Request for invalid exported function" + pubFunct + " of script " + scriptNum);
            return null;
        }

        var xstack = new ExecStack(callingObj, callingObj, sp, argc, argp,
                            seg, new Reg(seg, temp), -1, pubFunct, -1,
                            state.executionStack.length - 1, ExecStackType.EXEC_STACK_TYPE_CALL);
        state.executionStack.push(xstack);
        return xstack;
    }
    
    var validateVariable = function(r, stack_base, type, max, index) {
        var names = ["global", "local", "temp", "param"];
    
        if (index < 0 || index >= max.index) {
            var txt = "[VM] Attempt to use invalid " + names[type] + " variable 0x" + index.toString(16);
            
            if (max == 0)
                txt += "(variable type invalid)";
            else
                txt += "(out of range [0.." + (max - 1) + "])";
    
            if (type == VariableTypes.VAR_PARAM || type == VariableTypes.VAR_TEMP) {
                var total_offset = r.index - stack_base;
                if (total_offset < 0 || total_offset >= VM_STACK_SIZE) {
                    // Fatal, as the game is trying to do an OOB access
                    Debug.error(txt + "[VM] Access would be outside even of the stack; access denied");
                    return false;
                } else {
                    Debug.log("VM", txt);
                    Debug.log("VM", "[VM] Access within stack boundaries; access granted.");
                    return true;
                }
            }
            return false;
        }
        return true;
    }
    
    var validateProperty = function(obj, index) {
        // A static dummy reg_t, which we return if obj or index turn out to be
        // invalid. Note that we cannot just return NULL_REG, because client code
        // may modify the value of the returned reg_t.
        var dummyReg = new Reg(0, 0);
    
        // If this occurs, it means there's probably something wrong with the garbage
        // collector, so don't hide it with fake return values
        if (obj == null)
            Debug.error("validate_property: Sending to disposed object");
    
        if (getSciVersion() == SciVersion.SCI_VERSION_3)
            index = obj.locateVarSelector(index);
        else
            index >>= 1;
    
        if (index < 0 || index >= obj.getVarCount()) {
            // This is same way sierra does it and there are some games, that contain such scripts like
            //  iceman script 998 (fred::canBeHere, executed right at the start)
//            debugC(kDebugLevelVM, "[VM] Invalid property #%d (out of [0..%d]) requested from object %04x:%04x (%s)",
  //              index, obj->getVarCount(), PRINT_REG(obj->getPos()), s->_segMan->getObjectName(obj->getPos()));
            return dummyReg;
        }
    
        return obj.getVariableRef(index);
    }


    // FIXME
    var readVar = function(type, index) {
        if (validateVariable(state.variables[type], state.stackBase, type, state.variablesMax[type], index)) {
            if (state.variables[type].getValue(index).segment == 0xffff) {
                switch (type) {
                case VariableTypes.VAR_TEMP: {
                    // Uninitialized read on a temp
                    //  We need to find correct replacements for each situation manually
/*                    SciTrackOriginReply originReply;
                    SciWorkaroundSolution solution = trackOriginAndFindWorkaround(index, uninitializedReadWorkarounds, &originReply);
                    if (solution.type == WORKAROUND_NONE) {
    #ifdef RELEASE_BUILD
                        // If we are running an official ScummVM release -> fake 0 in unknown cases
                        warning("Uninitialized read for temp %d from method %s::%s (room %d, script %d, localCall %x)",
                        index, originReply.objectName.c_str(), originReply.methodName.c_str(), s->currentRoomNumber(),
                        originReply.scriptNr, originReply.localCallOffset);
    
                        s->variables[type][index] = NULL_REG;
                        break;
    #else
                        error("Uninitialized read for temp %d from method %s::%s (room %d, script %d, localCall %x)",
                        index, originReply.objectName.c_str(), originReply.methodName.c_str(), s->currentRoomNumber(),
                        originReply.scriptNr, originReply.localCallOffset);
    #endif
                    }
                    assert(solution.type == WORKAROUND_FAKE);*/
                    //state.variables[type].setValue(index, new Reg(0, solution.value));
                    
                    state.variables[type].setValue(index, new Reg(0, 0));
                    break;
                }
                case VariableTypes.VAR_PARAM:
                    // Out-of-bounds read for a parameter that goes onto stack and hits an uninitialized temp
                    //  We return 0 currently in that case
                    Debug.log("VM", "[VM] Read for a parameter goes out-of-bounds, onto the stack and gets uninitialized temp");
                    return new Reg(0, 0);
                default:
                    break;
                }
                Debug.error("Segment is 0xFFFF");
            }
            return state.variables[type].getValue(index).clone();
        } else
            return state.acc.clone();
    }

    // FIXME
    var writeVar = function(type, index, value) {
        value = value.clone();
        
        if(value.segment == 0xFFFF) {
            Debug.error("Value segment is 0xFFFF");
        }
    
        if (validateVariable(state.variables[type], state.stackBase, type, state.variablesMax[type], index)) {
    
            // WORKAROUND: This code is needed to work around a probable script bug, or a
            // limitation of the original SCI engine, which can be observed in LSL5.
            //
            // In some games, ego walks via the "Grooper" object, in particular its "stopGroop"
            // child. In LSL5, during the game, ego is swapped from Larry to Patti. When this
            // happens in the original interpreter, the new actor is loaded in the same memory
            // location as the old one, therefore the client variable in the stopGroop object
            // points to the new actor. This is probably why the reference of the stopGroop
            // object is never updated (which is why I mentioned that this is either a script
            // bug or some kind of limitation).
            //
            // In our implementation, each new object is loaded in a different memory location,
            // and we can't overwrite the old one. This means that in our implementation,
            // whenever ego is changed, we need to update the "client" variable of the
            // stopGroop object, which points to ego, to the new ego object. If this is not
            // done, ego's movement will not be updated properly, so the result is
            // unpredictable (for example in LSL5, Patti spins around instead of walking).
            if (index == 0 && type == VariableTypes.VAR_GLOBAL && getSciVersion() > SciVersion.SCI_VERSION_0_EARLY) {	// global 0 is ego
                var stopGroopPos = SegManager.findObjectByName("stopGroop");
                if (!stopGroopPos.isNull()) {	// does the game have a stopGroop object?
                    // Find the "client" member variable of the stopGroop object, and update it
                    var varp = new ObjVarRef();
                    if (lookupSelector(stopGroopPos, SelectorCache.client, varp, null) == SelectorType.Variable) {
                        var clientVar = varp.getPointer();
                        clientVar.set(value);
                    }
                }
            }
    
            // If we are writing an uninitialized value into a temp, we remove the uninitialized segment
            //  this happens at least in sq1/room 44 (slot-machine), because a send is missing parameters, then
            //  those parameters are taken from uninitialized stack and afterwards they are copied back into temps
            //  if we don't remove the segment, we would get false-positive uninitialized reads later
            if (type == VariableTypes.VAR_TEMP && value.segment == 0xffff)
                value.segment = 0;
    
            state.variables[type].setValue(index, value);
    
            // If the game is trying to change its speech/subtitle settings, apply the ScummVM audio
            // options first, if they haven't been applied yet
            /*if (type == VAR_GLOBAL && index == 90 && !g_sci->getEngineState()->_syncedAudioOptions) {
                g_sci->syncIngameAudioOptions();
                g_sci->getEngineState()->_syncedAudioOptions = true;
            }*/
        }
    }

    
    var init = function() {
        state.stack = SegManager.allocStack(VM_STACK_SIZE);
        state.stackTop = VM_STACK_SIZE;
    };
    
    var update = function() {
        var gameTicks = Engine.getTicks();
    
        if(Input.getKey(Input.down)) {
            maxCycles += 10;
        }
    
        if(maxCycles <= 0)
            return;
            
        if(state.waitTicks > 0) {
//            state.waitTicks --;
            state.waitTicks -= (gameTicks - state.lastWaitTime);
            if(state.waitTicks < 0)
                state.waitTicks = 0;
            return;
        }
        
        for(var cycle = 0; maxCycles > 0 && state.waitTicks == 0 && cycle<cyclesPerFrame && mainRunFunction != null && FileLoader.finishedLoading(); cycle++) {
            try {
                if(mainRunFunction() == false) {
                    mainRunFunction = null;
                }
            }
            catch(exception) {
                if(exception == VM_LOAD_STALL) {
                    break;
                }
                else {
                    Debug.error(exception.stack);
                    throw exception;
                }
            }
            
            maxCycles --;
            
            if(state.lastWaitTime == gameTicks) {
               break;
            }
        }
        
        if(cycle == cyclesPerFrame) {
            Debug.warn("Need more cycles per frame!");
        }
    }
    
    var run = function() {
        var newRun = createRunFunction();
        
        if(mainRunFunction == null) {
            mainRunFunction = newRun;
        }
        else {
            var maxCycles = 1000;
            for(var cycle = 0; cycle<maxCycles; cycle++) {
                if(newRun() == false)
                    return;
            }
            
            Debug.error("Out of cycles!");
        }
    }
    
    var dumpStack = function() {
        Debug.log("sp: " + state.xs.sp.toString(16) + " fp: " + state.xs.fp.toString(16));
        for(var x = state.xs.sp - 1; x >= state.stackBase; x--) {
            Debug.log("0x" + x.toString(16) + " = " + state.stack[x].toString());
        }
    }
    
    var createRunFunction = function() {
        // Execution variables
        var r_temp = new Reg(0, 0);
        var xs_new = null;
        var temp;
        var s_temp; // Temporary stack pointer
        var obj;
        var scr = null;
        var localScript;
        var oldExecutionStackBase;
        var prevOpcode = 0;
        // end of execution variables
    
        state.rest = 0;	// &rest adjusts the parameter count by this value
        // Current execution data:
        if(state.executionStack.length > 0) {
            state.xs = state.executionStack[state.executionStack.length - 1];
        }
        
        obj = SegManager.getObject(state.xs.objp);
        localScript = SegManager.getScriptFromSegment(state.xs.localSegment);
        oldExecutionStackBase = state.executionStackBase;

        // Used to detect the stack bottom, for "physical" returns
    
        if (localScript == null)
            Debug.error("run_vm(): program counter gone astray (local_script pointer is null)");
    
        state.executionStackBase = state.executionStack.length - 1;
    
        state.variablesSegment[VariableTypes.VAR_TEMP] = SegManager.findSegmentByType(SegmentType.SEG_TYPE_STACK);
        state.variablesSegment[VariableTypes.VAR_PARAM] = SegManager.findSegmentByType(SegmentType.SEG_TYPE_STACK);
        state.variablesBase[VariableTypes.VAR_TEMP] = new ArrayPtr(state.stack, state.stackBase);
        state.variablesBase[VariableTypes.VAR_PARAM] = new ArrayPtr(state.stack, state.stackBase);
    
        state.executionStackPosChanged = true;

        return function() { 
            if (state.executionStackPosChanged) {
                scr = SegManager.getScriptFromSegment(state.xs.pc.segment);
                if (scr == null) {
                    Debug.error("No script in segment " + state.xs.pc.segment);
                }
                state.xs = state.executionStack[state.executionStack.length - 1];
                state.executionStackPosChanged = false;
    
                obj = SegManager.getObject(state.xs.objp);
                localScript = SegManager.getScriptFromSegment(state.xs.localSegment);
                if (localScript == null) {
                    Debug.error("Could not find local script from segment " + state.xs.localSegment);
                } else {
                    state.variablesSegment[VariableTypes.VAR_LOCAL] = localScript.getLocalsSegment();
                    state.variablesBase[VariableTypes.VAR_LOCAL] = localScript.getLocalsBegin();
                    state.variables[VariableTypes.VAR_LOCAL] = localScript.getLocalsBegin();
                    state.variablesMax[VariableTypes.VAR_LOCAL] = localScript.localsCount;
                    state.variablesMax[VariableTypes.VAR_TEMP] = state.xs.sp - state.xs.fp;
                    state.variablesMax[VariableTypes.VAR_PARAM] = state.xs.argc + 1;
                }
                state.variables[VariableTypes.VAR_TEMP] = new ArrayPtr(state.stack, state.xs.fp);
                state.variables[VariableTypes.VAR_PARAM] = new ArrayPtr(state.stack, state.xs.variablesArgp);
            }
    
            if (state.xs.sp < state.xs.fp)
                Debug.error("run_vm(): stack underflow!");
    
            state.variablesMax[VariableTypes.VAR_TEMP] = state.xs.sp - state.xs.fp;
    
            if (state.xs.pc.offset >= scr.buf.getLength())
                Debug.error("run_vm(): program counter gone astray");
    
            // Get opcode
            var op = readVMInstruction(scr.buf, state.xs.pc.offset);
            state.xs.pc.offset += op.offset;
            var opparams = op.params;
    
            // Check for infinite loop!
            if (prevOpcode != 0xFF) {
                if (prevOpcode == opcode.op_eq_  || prevOpcode == opcode.op_ne_  ||
                    prevOpcode == opcode.op_gt_  || prevOpcode == opcode.op_ge_  ||
                    prevOpcode == opcode.op_lt_  || prevOpcode == opcode.op_le_  ||
                    prevOpcode == opcode.op_ugt_ || prevOpcode == opcode.op_uge_ ||
                    prevOpcode == opcode.op_ult_ || prevOpcode == opcode.op_ule_) {
                    if (op.opcode == opcode.op_jmp)
                        error("Infinite loop detected in script " + scr.getScriptNumber());
                }
            }
    
            prevOpcode = op.opcode;
            
            
            var debugOutput = "VM [" + state.xs.pc.toString() + "] :" + enumToString(opcode, op.opcode) + " ";
            for(var param = 0; param<op.params.length; param++) {
                debugOutput += op.params[param];
                if(param != op.params.length - 1) {
                    debugOutput += ", ";
                }
            }
            debugOutput += " acc: " + state.acc.toString() + " script: " + scr.scriptNum + " local script: " + localScript.scriptNum;
            Debug.log("VM", debugOutput);
            
            
            //dumpStack();
            //Disassembler.disassembleCode(scr.buf, state.xs.pc.offset, state.xs.pc.offset + 20);
            
            switch (op.opcode) {
    
                case opcode.op_bnot: // 0x00 (00)
                    // Binary not
                    state.acc = new Reg(0, 0xffff ^ state.acc.requireUint16());
                    break;
        
                case opcode.op_add: // 0x01 (01)
                    state.acc = pop32().add(state.acc);
                    break;
        
                case opcode.op_sub: // 0x02 (02)
                    state.acc = pop32().subtract(state.acc);
                    break;
        
                case opcode.op_mul: // 0x03 (03)
                    state.acc = pop32().multiply(state.acc);
                    break;
        
                case opcode.op_div: // 0x04 (04)
                    // we check for division by 0 inside the custom reg_t division operator
                    state.acc = pop32().divide(state.acc);
                    break;
        
                case opcode.op_mod: // 0x05 (05)
                    // we check for division by 0 inside the custom reg_t modulo operator
                    state.acc = pop32().modulo(state.acc);
                    break;
        
                case opcode.op_shr: // 0x06 (06)
                    // Shift right logical
                    state.acc = pop32().shiftRight(state.acc);
                    break;
        
                case opcode.op_shl: // 0x07 (07)
                    // Shift left logical
                    state.acc = pop32().shiftLeft(state.acc);
                    break;
        
                case opcode.op_xor: // 0x08 (08)
                    state.acc = pop32().bitwiseXor(state.acc);
                    break;
        
                case opcode.op_and: // 0x09 (09)
                    state.acc = pop32().bitwiseAnd(state.acc);
                    break;
        
                case opcode.op_or: // 0x0a (10)
                    state.acc = pop32().bitwiseOr(state.acc);
                    break;
        
                case opcode.op_neg:	// 0x0b (11)
                    state.acc = new Reg(0, -state.acc.requireSint16());
                    break;
        
                case opcode.op_not: // 0x0c (12)
                    state.acc = new Reg(0, !(state.acc.offset != 0 || state.acc.segment != 0) ? 1 : 0);
                    // Must allow pointers to be negated, as this is used for checking whether objects exist
                    break;
        
                case opcode.op_eq_: // 0x0d (13)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().equals(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_ne_: // 0x0e (14)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().notEqual(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_gt_: // 0x0f (15)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().greaterThan(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_ge_: // 0x10 (16)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().greaterEqual(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_lt_: // 0x11 (17)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().lessThan(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_le_: // 0x12 (18)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().lessEqual(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_ugt_: // 0x13 (19)
                    // > (unsigned)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().greaterThanU(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_uge_: // 0x14 (20)
                    // >= (unsigned)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().greaterEqualU(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_ult_: // 0x15 (21)
                    // < (unsigned)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().lessThanU(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_ule_: // 0x16 (22)
                    // <= (unsigned)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().lessEqualU(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_bt: // 0x17 (23)
                    // Branch relative if true
                    if(state.acc.offset != 0 || state.acc.segment != 0) {
                        Debug.log("Branch", "[VM] op_bt branched at pc " + state.xs.pc.offset);
                        state.xs.pc.offset += opparams[0];
                    }
                    else {
                        Debug.log("Branch", "[VM] op_bt did not branch at pc " + state.xs.pc.offset);
                    }
        
                    if(state.xs.pc.offset >= localScript.buf.getLength()) {
                        Debug.error("[VM] op_bt: request to jump past the end of script " + localScript.scriptNum);
                    }
                    break;
        
                case opcode.op_bnt: // 0x18 (24)
                    // Branch relative if not true
                    if (!(state.acc.offset != 0 || state.acc.segment != 0)) {
                        Debug.log("Branch", "[VM] op_bnt branched at pc " + state.xs.pc.offset);
                        state.xs.pc.offset += opparams[0];
                    }
                    else {
                        Debug.log("Branch", "[VM] op_bnt did not branch at pc " + state.xs.pc.offset);
                    }
        
                    if(state.xs.pc.offset >= localScript.buf.getLength()) {
                        Debug.error("[VM] op_bnt: request to jump past the end of script " + localScript.scriptNum);
                    }
                    break;
        
                case opcode.op_jmp: // 0x19 (25)
                    state.xs.pc.offset += opparams[0];
    
                    if(state.xs.pc.offset >= localScript.buf.getLength()) {
                        Debug.error("[VM] op_jmp: request to jump past the end of script " + localScript.scriptNum);
                    }
                    break;
        
                case opcode.op_ldi: // 0x1a (26)
                    // Load data immediate
                    state.acc = new Reg(0, opparams[0]);
                    break;
        
                case opcode.op_push: // 0x1b (27)
                    // Push to stack
                    push32(state.acc);
                    break;
        
                case opcode.op_pushi: // 0x1c (28)
                    // Push immediate
                    push(opparams[0]);
                    break;
        
                case opcode.op_toss: // 0x1d (29)
                    // TOS (Top Of Stack) subtract
                    state.xs.sp--;
                    break;
        
                case opcode.op_dup: // 0x1e (30)
                    // Duplicate TOD (Top Of Stack) element
                    r_temp = state.stack[state.xs.sp - 1].clone();
                    push32(r_temp);
                    break;
        
                case opcode.op_link: // 0x1f (31)
                    // We shouldn't initialize temp variables at all
                    //  We put special segment 0xFFFF in there, so that uninitialized reads can get detected
                    for (var i = 0; i < opparams[0]; i++)
                        state.stack[state.xs.sp + i] = new Reg(0xffff, 0);
        
                    state.xs.sp += opparams[0];
                    break;
        
                case opcode.op_call: { // 0x20 (32)
                    // Call a script subroutine
                    var argc = (opparams[1] >> 1) // Given as offset, but we need count
                               + 1 + state.rest;
                    var callBasePos = state.xs.sp - argc;
                    var callBase = state.stack[callBasePos];
                    
                    state.stack[state.xs.sp + 1].offset += state.rest;
        
                    var localCallOffset = state.xs.pc.offset + opparams[0];
        
                    var xstack = new ExecStack(state.xs.objp, state.xs.objp, state.xs.sp,
                                    (callBase.requireUint16()) + state.rest, callBasePos,
                                    state.xs.localSegment, new Reg(state.xs.pc.segment, localCallOffset),
                                    NULL_SELECTOR, -1, localCallOffset, state.executionStack.length - 1,
                                    ExecStackType.EXEC_STACK_TYPE_CALL);
        
                    state.executionStack.push(xstack);
                    xs_new = xstack;
        
                    state.rest = 0; // Used up the &rest adjustment
                    state.xs.sp = callBasePos;
        
                    state.executionStackPosChanged = true;
                    break;
                }
        
                case opcode.op_callk: { // 0x21 (33)
                    // Run the garbage collector, if needed
                    // TODO
                    /*if (s->gcCountDown-- <= 0) {
                        s->gcCountDown = s->scriptGCInterval;
                        run_gc(s);
                    }*/
                    var oldSp = state.xs.sp;
                    var oldRest = state.rest;
        
                    // Call kernel function
                    state.xs.sp -= (opparams[1] >> 1) + 1;
        
                    var oldScriptHeader = (getSciVersion() == SciVersion.SCI_VERSION_0_EARLY);
                    if (!oldScriptHeader)
                        state.xs.sp -= state.rest;
        
                    var argc = state.stack[state.xs.sp].requireUint16();
        
                    if (!oldScriptHeader)
                        argc += state.rest;
        
                    try {
                        callKernelFunc(opparams[0], argc);
                    }
                    catch(exception) {
                        if(exception == VM_LOAD_STALL) {
                            state.xs.pc.offset -= op.offset;
                            state.xs.sp = oldSp;
                            state.rest = oldRest;
                        }
                        throw exception;
                    }
        
                    if (!oldScriptHeader)
                        state.rest = 0;
        
                    // Calculate xs again: The kernel function might
                    // have spawned a new VM
        
                    xs_new = state.executionStack[state.executionStack.length - 1];
                    state.executionStackPosChanged = true;
        
                    // If a game is being loaded, stop processing
                    // TODO
                    //if (s->abortScriptProcessing != kAbortNone)
                      //  return; // Stop processing
        
                    break;
                }
        
                case opcode.op_callb: // 0x22 (34)
                    // Call base script
                    temp = ((opparams[1] >> 1) + state.rest + 1);
                    s_temp = state.xs.sp;
                    state.xs.sp -= temp;
        
                    state.stack[state.xs.sp].offset += state.rest;
                    
                    try {
                        xs_new = executeMethod(0, opparams[0], s_temp, state.xs.objp,
                                                state.stack[state.xs.sp].offset, state.xs.sp);
                    }
                    catch(exception) {
                        if(exception == VM_LOAD_STALL) {
                            state.xs.pc.offset -= op.offset;
                            state.stack[state.xs.sp].offset -= state.rest;
                            state.xs.sp = s_temp;
                        }
                        throw exception;
                    }
                                            
                    state.rest = 0; // Used up the &rest adjustment
                    if (xs_new != null)    // in case of error, keep old stack
                        state.executionStackPosChanged = true;
                    break;
        
                case opcode.op_calle: // 0x23 (35)
                    // Call external script
                    temp = ((opparams[2] >> 1) + state.rest + 1);
                    s_temp = state.xs.sp;
                    state.xs.sp -= temp;
        
                    state.stack[state.xs.sp].offset += state.rest;
                    
                    try {
                        xs_new = executeMethod(opparams[0], opparams[1], s_temp, state.xs.objp,
                                                state.stack[state.xs.sp].offset, state.xs.sp);
                    }
                    catch(exception) {
                        if(exception == VM_LOAD_STALL) {
                            state.xs.pc.offset -= op.offset;
                            state.stack[state.xs.sp].offset -= state.rest;
                            state.xs.sp = s_temp;
                        }
                        throw exception;
                    }
                                            
                    state.rest = 0; // Used up the &rest adjustment
        
                    if (xs_new != null)  // in case of error, keep old stack
                        state.executionStackPosChanged = true;
                    break;
        
                case opcode.op_ret: // 0x24 (36)
                    // Return from an execution loop started by call, calle, callb, send, self or super
                    do {
                        var old_sp2 = state.xs.sp;
                        var old_fp = state.xs.fp;
                        var old_xs = state.executionStack[state.executionStack.length - 1];
        
                        if (state.executionStack.length - 1 == state.executionStackBase) { // Have we reached the base?
                            state.executionStackBase = oldExecutionStackBase; // Restore stack base
        
                            state.executionStack.pop();
        
                            state.executionStackPosChanged = true;
                            
                            return false; // "Hard" return
                        }
        
                        if (old_xs.type == ExecStackType.EXEC_STACK_TYPE_VARSELECTOR) {
                            // varselector access?
                            var varPtr = old_xs.getVarPointer();
                            if (old_xs.argc > 0) // write?
                                varPtr.set(state.stack[old_xs.variablesArgp + 1]);
                            else // No, read
                                state.acc.set(varPtr);
                        }
        
                        // Not reached the base, so let's do a soft return
                        state.executionStack.pop();
                        state.executionStackPosChanged = true;
                        state.xs = state.executionStack[state.executionStack.length - 1];
        
                        if (state.xs.sp == CALL_SP_CARRY // Used in sends to 'carry' the stack pointer
                                || state.xs.type != ExecStackType.EXEC_STACK_TYPE_CALL) {
                            state.xs.sp = old_sp2;
                            state.xs.fp = old_fp;
                        }
        
                    } while (state.xs.type == ExecStackType.EXEC_STACK_TYPE_VARSELECTOR);
                    // Iterate over all varselector accesses
                    state.executionStackPosChanged = true;
                    xs_new = state.xs;
        
                    break;
        
                case opcode.op_send: // 0x25 (37)
                    // Send for one or more selectors
                    temp = state.xs.sp;
                    state.xs.sp -= ((opparams[0] >> 1) + state.rest); // Adjust stack
        
                    state.stack[state.xs.sp + 1].offset += state.rest;
                    xs_new = sendSelector(state.acc, state.acc, temp,
                                            (opparams[0] >> 1) + state.rest, state.xs.sp);
        
                    if (xs_new != null && xs_new != state.xs)
                        state.executionStackPosChanged = true;
        
                    state.rest = 0;
        
                    break;
        
                /*case 0x26: // (38)
                case 0x27: // (39)
                    if (getSciVersion() == SciVersion.SCI_VERSION_3) {
                        if (extOpcode == 0x4c)
                            state.acc = obj->getInfoSelector();
                        else if (extOpcode == 0x4d)
                            PUSH32(obj->getInfoSelector());
                        else if (extOpcode == 0x4e)
                            state.acc = obj->getSuperClassSelector();	// TODO: is this correct?
                        // TODO: There are also opcodes in
                        // here to get the superclass, and possibly the species too.
                        else
                            error("Dummy opcode 0x%x called", opcode);	// should never happen
                    } else
                        error("Dummy opcode 0x%x called", opcode);	// should never happen
                    break;
        */
                case opcode.op_class: // 0x28 (40)
                    // Get class address
                    try {
                        r_temp = SegManager.getClassAddress(opparams[0], ScriptLoadType.SCRIPT_GET_LOCK,
                                                        state.xs.pc);
                    }
                    catch(exception) {
                        if(exception == VM_LOAD_STALL) {
                            state.xs.pc.offset -= op.offset;
                        }
                        throw exception;
                    }
                    
                    state.acc = r_temp;
                    break;
        
                case 0x29: // (41)
                    error("Dummy opcode 0x%x called", opcode);	// should never happen
                    break;
        
                case opcode.op_self: // 0x2a (42)
                    // Send to self
                    s_temp = state.xs.sp;
                    state.xs.sp -= ((opparams[0] >> 1) + state.rest); // Adjust stack
        
                    state.stack[state.xs.sp + 1].offset += state.rest;
                    xs_new = sendSelector(state.xs.objp, state.xs.objp,
                                            s_temp, (opparams[0] >> 1) + state.rest,
                                            state.xs.sp);
        
                    if (xs_new != null && xs_new != state.xs)
                        state.executionStackPosChanged = true;
        
                    state.rest = 0;
                    break;
        
                case opcode.op_super: // 0x2b (43)
                    // Send to any class
                    try {
                        r_temp = SegManager.getClassAddress(opparams[0], ScriptLoadType.SCRIPT_GET_LOAD, state.xs.pc);
                    }
                    catch(exception) {
                        if(exception == VM_LOAD_STALL) {
                            state.xs.pc.offset -= op.offset;
                        }
                        throw exception;
                    }
        
                    if (!r_temp.isPointer())
                        Debug.error("[VM]: Invalid superclass in object");
                    else {
                        s_temp = state.xs.sp;
                        state.xs.sp -= ((opparams[1] >> 1) + state.rest); // Adjust stack
        
                        state.stack[state.xs.sp + 1].offset += state.rest;
                        xs_new = sendSelector(r_temp, state.xs.objp, s_temp,
                                                (opparams[1] >> 1) + state.rest,
                                                state.xs.sp);
        
                        if (xs_new != null && xs_new != state.xs)
                            state.executionStackPosChanged = true;
        
                        state.rest = 0;
                    }
        
                    break;
        
                case opcode.op_rest: // 0x2c (44)
                    // Pushes all or part of the parameter variable list on the stack
                    temp = opparams[0] & 0xFFFF; // First argument as uint16
                    state.rest = state.xs.argc - temp + 1; // +1 because temp counts the paramcount while argc doesn't
                    if(state.rest < 0)
                        state.rest = 0;
        
                    for (; temp <= state.xs.argc; temp++)
                        push32(state.stack[state.xs.variablesArgp + temp]);
        
                    break;
        
                case opcode.op_lea: // 0x2d (45)
                    // Load Effective Address
                    temp = opparams[0] >> 1;
                    var_number = temp & 0x03; // Get variable type
        
                    // Get variable block offset
                    r_temp = new Reg(0, 0);
                    r_temp.segment = state.variablesSegment[var_number];
                    r_temp.offset = state.variables[var_number].index - state.variablesBase[var_number].index;
        
                    if (temp & 0x08)  // Add accumulator offset if requested
                        r_temp.offset += state.acc.requireSint16();
        
                    r_temp.offset += opparams[1];  // Add index
                    r_temp.offset *= 2; // variables are 16 bit
                    // That's the immediate address now
                    state.acc = r_temp.clone();
                    break;
        
        
                case opcode.op_selfID: // 0x2e (46)
                    // Get 'self' identity
                    state.acc = state.xs.objp.clone();
                    break;
        
                case 0x2f: // (47)
                    error("Dummy opcode 0x%x called", opcode);	// should never happen
                    break;
        
                case opcode.op_pprev: // 0x30 (48)
                    // Pushes the value of the prev register, set by the last comparison
                    // bytecode (eq?, lt?, etc.), on the stack
                    push32(state.prev);
                    break;
        
                case opcode.op_pToa: // 0x31 (49)
                    // Property To Accumulator
                    state.acc = validateProperty(obj, opparams[0]).clone();
                    break;
        
                case opcode.op_aTop: // 0x32 (50)
                    // Accumulator To Property
                    validateProperty(obj, opparams[0]).set(state.acc);
                    break;
        
                case opcode.op_pTos: // 0x33 (51)
                    // Property To Stack
                    push32(validateProperty(obj, opparams[0]).clone());
                    break;
        
                case opcode.op_sTop: // 0x34 (52)
                    // Stack To Property
                    validateProperty(obj, opparams[0]).set(pop32());
                    break;
        
                case opcode.op_ipToa: // 0x35 (53)
                case opcode.op_dpToa: // 0x36 (54)
                case opcode.op_ipTos: // 0x37 (55)
                case opcode.op_dpTos: // 0x38 (56)
                    {
                    // Increment/decrement a property and copy to accumulator,
                    // or push to stack
                    var opProperty = validateProperty(obj, opparams[0]); 
                    if ((op.opcode & 1) != 0)
                        opProperty.offset += 1;
                    else
                        opProperty.offset -= 1;
                        
                    opProperty.offset &= 0xFFFF;
        
                    if (op.opcode == opcode.op_ipToa || op.opcode == opcode.op_dpToa)
                        state.acc = opProperty.clone();
                    else
                        push32(opProperty.clone());
                    break;
                }
        
                case opcode.op_lofsa: // 0x39 (57)
                case opcode.op_lofss: // 0x3a (58)
                    // Load offset to accumulator or push to stack
                    r_temp = new Reg(state.xs.pc.segment, 0);
        
                    switch (detectLofsType()) {
                    case SciVersion.SCI_VERSION_0_EARLY:
                        r_temp.offset = state.xs.pc.offset + opparams[0];
                        break;
                    case SciVersion.SCI_VERSION_1_MIDDLE:
                        r_temp.offset = opparams[0];
                        break;
                    case SciVersion.SCI_VERSION_1_1:
                        r_temp.offset = opparams[0] + localScript.getScriptSize();
                        break;
                    case SciVersion.SCI_VERSION_3:
                        // In theory this can break if the variant with a one-byte argument is
                        // used. For now, assume it doesn't happen.
//                        r_temp.offset = local_script->relocateOffsetSci3(s->xs->addr.pc.offset-2);
                        break;
                    default:
                        Debug.error("Unknown lofs type");
                    }
                    
                    r_temp.offset &= 0xFFFF;
        
                    if (r_temp.offset >= scr.getBufSize())
                        Debug.error("VM: lofsa/lofss operation overflowed:");
//                        %04x:%04x beyond end"                               " of script (at %04x)", PRINT_REG(r_temp), scr->getBufSize());
        
                    if (op.opcode == opcode.op_lofsa)
                        state.acc = r_temp.clone();
                    else
                        push32(r_temp);
                    break;
        
                case opcode.op_push0: // 0x3b (59)
                    push(0);
                    break;
        
                case opcode.op_push1: // 0x3c (60)
                    push(1);
                    break;
        
                case opcode.op_push2: // 0x3d (61)
                    push(2);
                    break;
        
                case opcode.op_pushSelf: // 0x3e (62)
                    // Compensate for a bug in non-Sierra compilers, which seem to generate
                    // pushSelf instructions with the low bit set. This makes the following
                    // heuristic fail and leads to endless loops and crashes. Our
                    // interpretation of this seems correct, as other SCI tools, like for
                    // example SCI Viewer, have issues with these scripts (e.g. script 999
                    // in Circus Quest). Fixes bug #3038686.
                    if (!(op.extOpcode & 1)) {  // || g_sci->getGameId() == GID_FANMADE) {
                        push32(state.xs.objp);
                    } else {
                        // Debug opcode op_file
                    }
                    break;
        
                case opcode.op_line: // 0x3f (63)
                    // Debug opcode (line number)
                    break;
        
                case opcode.op_lag: // 0x40 (64)
                case opcode.op_lal: // 0x41 (65)
                case opcode.op_lat: // 0x42 (66)
                case opcode.op_lap: // 0x43 (67)
                    // Load global, local, temp or param variable into the accumulator
                case opcode.op_lagi: // 0x48 (72)
                case opcode.op_lali: // 0x49 (73)
                case opcode.op_lati: // 0x4a (74)
                case opcode.op_lapi: // 0x4b (75)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_lagi ? state.acc.requireSint16() : 0);
                    state.acc = readVar(var_type, var_number);
                    break;
        
                case opcode.op_lsg: // 0x44 (68)
                case opcode.op_lsl: // 0x45 (69)
                case opcode.op_lst: // 0x46 (70)
                case opcode.op_lsp: // 0x47 (71)
                    // Load global, local, temp or param variable into the stack
                case opcode.op_lsgi: // 0x4c (76)
                case opcode.op_lsli: // 0x4d (77)
                case opcode.op_lsti: // 0x4e (78)
                case opcode.op_lspi: // 0x4f (79)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_lsgi ? state.acc.requireSint16() : 0);
                    push32(readVar(var_type, var_number));
                    break;

                case opcode.op_sag: // 0x50 (80)
                case opcode.op_sal: // 0x51 (81)
                case opcode.op_sat: // 0x52 (82)
                case opcode.op_sap: // 0x53 (83)
                    // Save the accumulator into the global, local, temp or param variable
                case opcode.op_sagi: // 0x58 (88)
                case opcode.op_sali: // 0x59 (89)
                case opcode.op_sati: // 0x5a (90)
                case opcode.op_sapi: // 0x5b (91)
                    // Save the accumulator into the global, local, temp or param variable,
                    // using the accumulator as an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_sagi ? state.acc.requireSint16() : 0);
                    if (op.opcode >= opcode.op_sagi)	// load the actual value to store in the accumulator
                        state.acc = pop32();
                    writeVar(var_type, var_number, state.acc);
                    break;
        
                case opcode.op_ssg: // 0x54 (84)
                case opcode.op_ssl: // 0x55 (85)
                case opcode.op_sst: // 0x56 (86)
                case opcode.op_ssp: // 0x57 (87)
                    // Save the stack into the global, local, temp or param variable
                case opcode.op_ssgi: // 0x5c (92)
                case opcode.op_ssli: // 0x5d (93)
                case opcode.op_ssti: // 0x5e (94)
                case opcode.op_sspi: // 0x5f (95)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_ssgi ? state.acc.requireSint16() : 0);
                    writeVar(var_type, var_number, pop32());
                    break;
        
                case opcode.op_plusag: // 0x60 (96)
                case opcode.op_plusal: // 0x61 (97)
                case opcode.op_plusat: // 0x62 (98)
                case opcode.op_plusap: // 0x63 (99)
                    // Increment the global, local, temp or param variable and save it
                    // to the accumulator
                case opcode.op_plusagi: // 0x68 (104)
                case opcode.op_plusali: // 0x69 (105)
                case opcode.op_plusati: // 0x6a (106)
                case opcode.op_plusapi: // 0x6b (107)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_plusagi ? state.acc.requireSint16() : 0);
                    state.acc = readVar(var_type, var_number).add(1);
                    writeVar(var_type, var_number, state.acc);
                    break;
        
                case opcode.op_plussg: // 0x64 (100)
                case opcode.op_plussl: // 0x65 (101)
                case opcode.op_plusst: // 0x66 (102)
                case opcode.op_plussp: // 0x67 (103)
                    // Increment the global, local, temp or param variable and save it
                    // to the stack
                case opcode.op_plussgi: // 0x6c (108)
                case opcode.op_plussli: // 0x6d (109)
                case opcode.op_plussti: // 0x6e (110)
                case opcode.op_plusspi: // 0x6f (111)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_plussgi ? state.acc.requireSint16() : 0);
                    r_temp = readVar(var_type, var_number).add(1);
                    push32(r_temp);
                    writeVar(var_type, var_number, r_temp);
                    break;
        
                case opcode.op_minusag: // 0x70 (112)
                case opcode.op_minusal: // 0x71 (113)
                case opcode.op_minusat: // 0x72 (114)
                case opcode.op_minusap: // 0x73 (115)
                    // Decrement the global, local, temp or param variable and save it
                    // to the accumulator
                case opcode.op_minusagi: // 0x78 (120)
                case opcode.op_minusali: // 0x79 (121)
                case opcode.op_minusati: // 0x7a (122)
                case opcode.op_minusapi: // 0x7b (123)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_minusagi ? state.acc.requireSint16() : 0);
                    state.acc = readVar(var_type, var_number).subtract(1);
                    writeVar(var_type, var_number, state.acc);
                    break;
        
                case opcode.op_minussg: // 0x74 (116)
                case opcode.op_minussl: // 0x75 (117)
                case opcode.op_minusst: // 0x76 (118)
                case opcode.op_minussp: // 0x77 (119)
                    // Decrement the global, local, temp or param variable and save it
                    // to the stack
                case opcode.op_minussgi: // 0x7c (124)
                case opcode.op_minussli: // 0x7d (125)
                case opcode.op_minussti: // 0x7e (126)
                case opcode.op_minusspi: // 0x7f (127)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_minussgi ? state.acc.requireSint16() : 0);
                    r_temp = read_var(var_type, var_number).subtract(1);
                    push32(r_temp);
                    writeVar(var_type, var_number, r_temp);
                    break;
        
                default:
                    Debug.error("run_vm(): illegal opcode " + op.opcode + " " + enumToString(opcode, op.opcode));
    
            } // switch (opcode)
            
            if (state.executionStackPosChanged) // Force initialization
                state.xs = xs_new;
    
            if (state.xs != state.executionStack[state.executionStack.length - 1]) {
                Debug.error("xs is stale; last command was " + enumToString(opcode, op.opcode));
            }
            
            if(typeof state.acc.segment != 'number') {
                Debug.error("Acc corrupted");
                return false;
            }
            
            if(debugReg != null) {
                if(debugReg.offset == 0) {
                    Debug.log("What happened to my debug reg? boo hoo..");
                }
                else {
                    var tempObj = SegManager.getObject(debugReg);
                    if(tempObj.variables[5].offset == 0) {
                        Debug.log("What happened to my debug reg? boo hoo..");
                    }
                }
            }
            
            return true;
        }
    }
    
    reset();
    
    return {
        reset : reset,
        state : state,
        init : init,
        update : update,
        run : run,
        
        dumpStack : dumpStack
    };
})();