function kDoSound() {
    return new Reg(0, 0);
}

function kDoSoundInit() {
    Debug.log("Init sound!");
    return VM.state.acc;
}

kDoSound.prototype = {
    subFunctions : {
        0 : kDoSoundInit,
        1 : createStubFunction("SoundStub1"),
        2 : createStubFunction("SoundStub2"),
        3 : createStubFunction("SoundStub3"),
        4 : createStubFunction("SoundStub4"),
        5 : createStubFunction("SoundStub5"),
        6 : createStubFunction("SoundStub6"),
        7 : createStubFunction("SoundStub7"),
        8 : createStubFunction("SoundStub8"),
        9 : createStubFunction("SoundStub9"),
        10 : createStubFunction("SoundStub10"),
        11 : createStubFunction("SoundStub11"),
        12 : createStubFunction("SoundStub12"),
        13 : createStubFunction("SoundStub13"),
        14 : createStubFunction("SoundStub14"),
        15 : createStubFunction("SoundStub15"),
    }
};