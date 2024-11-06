export const ZERO_MIC = "0x0000000000000000000000000000000000000000000000000000000000000000";

export interface ExampleData<RNM, REQ, RES> {
    requestNoMic: RNM;
    request: REQ;
    response: RES;
    messageIntegrityCode: string;
    encodedRequestZeroMic: string;
    encodedRequest: string;
}

export const envBool = (variable: any, _default: boolean = false) => ["1", "t", "true", "yes"].includes(String(variable || _default).toLowerCase());
