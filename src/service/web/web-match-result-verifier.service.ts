/* eslint-disable @typescript-eslint/no-var-requires */
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { EncodedRequestResponse, MicResponse } from "../../dto/generic.dto";
import {
    AttestationResponseDTO_MatchResult_Response,
    MatchResult_Request,
    MatchResult_RequestBody,
    MatchResult_RequestNoMic,
    MatchResult_Response,
    MatchResult_ResponseBody,
} from "../../dto/MatchResult.dto";
import { AttestationDefinitionStore } from "../../external-libs/ts/AttestationDefinitionStore";
import { AttestationResponseStatus } from "../../external-libs/ts/AttestationResponse";
import { ExampleData } from "../../external-libs/ts/interfaces";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName, serializeBigInts } from "../../external-libs/ts/utils";
// import { getEventResults } from "../../lib/olympics-api";
import { getEventResults } from "../../lib/the-odds-api";

@Injectable()
export class WEBMatchResultVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<MatchResult_RequestNoMic, MatchResult_Request, MatchResult_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    // Add additional class members here.
    // Augment the constructor with additional (injected) parameters, if required. Update the constructor code.
    constructor() {
        this.store = new AttestationDefinitionStore("type-definitions");
        this.exampleData = JSON.parse(readFileSync("src/example-data/MatchResult.json", "utf8"));
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    async verifyRequestInternal(request: MatchResult_Request | MatchResult_RequestNoMic): Promise<AttestationResponseDTO_MatchResult_Response> {
        if (request.attestationType !== encodeAttestationName("MatchResult") || request.sourceId !== encodeAttestationName("WEB")) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: `Attestation type and source id combination not supported: (${request.attestationType}, ${
                        request.sourceId
                    }). This source supports attestation type 'MatchResult' (${encodeAttestationName(
                        "MatchResult",
                    )}) and source id '${"WEB"}' (${encodeAttestationName("WEB")}).`,
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        const fixedRequest = {
            ...request,
        } as MatchResult_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }

        return this.verifyRequest(fixedRequest);
    }

    /*
     * Verifies the match results against the following parameters:
     *   - date: match date (unix timestamp without hour - rounded down start of the day).
     *   - sport: match sport (enum Sports).
     *   - gender: for which gender is the match (0 = male, 1 = female, 2 = mixed).
     *   - teams: match teams.
     *
     * The response is expected to contain the following parameters:
     *   - timestamp: Unix timestamp of the exact match beginning
     *   - result: Possible return values are 1 = team 1 won, 2 = team 2 won, 3 = draw
     *
     * The verification survives if:
     * - the result is 1, 2 or 3.
     * - the timestamp it the exact match beginning. This is calculated by rounding the timestamp to the star of the day and comparing it to the request date parameter.
     *
     *    enum Sports {
     *        Basketball,
     *        Basketball3x3,
     *        Badminton,
     *        BeachVolley,
     *        FieldHockey,
     *        Football,
     *        Handball,
     *        TableTennis,
     *        Tennis,
     *        Volleyball,
     *        WaterPolo
     *    }
     */
    async verifyRequest(fixedRequest: MatchResult_Request): Promise<AttestationResponseDTO_MatchResult_Response> {
        //-$$$<start-verifyRequest> Start of custom code section. Do not change this comment.

        let responseBody: MatchResult_ResponseBody | undefined;
        let status = AttestationResponseStatus.INVALID;

        try {
            responseBody = await prepareResponseBody(fixedRequest.requestBody);
            if (
                Array.isArray(responseBody.results) &&
                responseBody.results.length === 2 &&
                responseBody.results.every(
                    (item: any) => typeof item === "string" && !isNaN(Number(item)) && Number.isInteger(Number(item)) && Number(item) >= 0,
                )
            ) {
                // Check if at least one of the scores is non-zero
                if (responseBody.results.some((item: string) => Number(item) !== 0)) {
                    status = AttestationResponseStatus.VALID;
                }
            }

            if (!responseBody.timestamp) {
                status = AttestationResponseStatus.INVALID;
            }
        } catch (error) {
            console.error("Error validating request: ", error);
        }

        return {
            status,
            response: {
                responseBody,
                attestationType: fixedRequest.attestationType,
                votingRound: "0",
                sourceId: fixedRequest.sourceId,
                requestBody: serializeBigInts(fixedRequest.requestBody),
                lowestUsedTimestamp: "0xffffffffffffffff",
            } as MatchResult_Response,
        };

        //-$$$<end-verifyRequest> End of custom code section. Do not change this comment.
    }

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponseDTO_MatchResult_Response> {
        const requestJSON = this.store.parseRequest<MatchResult_Request>(abiEncodedRequest);
        const response = await this.verifyRequestInternal(requestJSON);
        return response;
    }

    public async prepareResponse(request: MatchResult_RequestNoMic): Promise<AttestationResponseDTO_MatchResult_Response> {
        const response = await this.verifyRequestInternal(request);
        return response;
    }

    public async mic(request: MatchResult_RequestNoMic): Promise<MicResponse> {
        const result = await this.verifyRequestInternal(request);
        if (result.status !== AttestationResponseStatus.VALID) {
            return new MicResponse({ status: result.status });
        }
        const response = result.response;
        if (!response) return new MicResponse({ status: result.status });
        return new MicResponse({
            status: AttestationResponseStatus.VALID,
            messageIntegrityCode: this.store.attestationResponseHash<MatchResult_Response>(response, MIC_SALT),
        });
    }

    public async prepareRequest(request: MatchResult_RequestNoMic): Promise<EncodedRequestResponse> {
        const result = await this.verifyRequestInternal(request);
        if (result.status !== AttestationResponseStatus.VALID) {
            return new EncodedRequestResponse({ status: result.status });
        }
        const response = result.response;

        if (!response) return new EncodedRequestResponse({ status: result.status });
        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<MatchResult_Response>(response, MIC_SALT)!,
        } as MatchResult_Request;

        return new EncodedRequestResponse({
            status: AttestationResponseStatus.VALID,
            abiEncodedRequest: this.store.encodeRequest(newRequest),
        });
    }
}

/**
 * Gets the match result from the API. Each verifier should implement its own function to get the results from the API.
 * Data must be transferred in such a way that it complies with the response structure.
 *
 * @param requestBody Body of the request
 * @returns  Body of the response
 */
async function prepareResponseBody(requestBody: MatchResult_RequestBody): Promise<MatchResult_ResponseBody> {
    const results = await getEventResults(requestBody.teams, requestBody.sport, Number(requestBody.date));
    const responseBody = {
        timestamp: results.ts || "",
        results: results.results || [],
    } as MatchResult_ResponseBody;

    return responseBody;
}
