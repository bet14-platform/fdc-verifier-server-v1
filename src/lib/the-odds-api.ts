import "dotenv/config";
import logger from "../logger";
/**
 * The Odds API URL & Key.
 */
const THE_ODDS_API_URL = "https://api.the-odds-api.com/v4";
const THE_ODDS_API_KEY = process.env.ODDS_API_KEY;
if (!THE_ODDS_API_KEY) throw new Error("The Odds API Key was not provided");
/**
 * The Odds API types
 */
type Score = {
    name: string;
    score: string;
};

type Match = {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: number;
    completed: boolean;
    home_team: string;
    away_team: string;
    scores: Score[];
    last_update: string;
};

/**
 * Get sport string by sport index.
 * @param sportIndex Sport index.
 * @returns Sport string.
 */
function getSportBySportIndex(sportIndex: string): string {
    const sports: { [key: string]: string } = {
        "0": "soccer_epl", // Soccer EPL
        "1": "baseball_mlb", // Baseball MLB
        "2": "aussierules_afl", // AFL
    };

    return sports[sportIndex];
}

/**
 * Converts date string to UTC timestamp.
 * @param dateString Date string.
 * @returns UTC timestamp.
 */
function toUtcTimestamp(dateString: string): string {
    const date = new Date(dateString);
    const utcDateTime = date.toISOString();

    return (new Date(utcDateTime).getTime() / 1000).toString();
}

async function apiRequest(url: string): Promise<Response> {
    const response = await fetch(url);

    const remainingRequests = Number(response.headers.get("x-requests-remaining") || 0);
    const usedRequests = Number(response.headers.get("x-requests-used") || 0);

    logger.debug(`Odds API: Requests remaining = ${remainingRequests}; Used: ${usedRequests}`);

    if (remainingRequests < 100) {
        logger.warn(`Odds API requests nearly exhausted! Only ${remainingRequests} left.`);
    }

    if (remainingRequests === 0) {
        logger.error("Odds API requests exhausted!");
    }

    return response;
}

/**
 * Returns match outcome for given eventId and sport.
 * @param sport Sport string.
 * @returns Schedule.
 */
async function getMatch(sport: string, teams: string[], startTime: number): Promise<Match | null> {
    try {
        const res = await apiRequest(
            `${THE_ODDS_API_URL}/sports/${sport}/scores?` + new URLSearchParams({ apiKey: THE_ODDS_API_KEY, daysFrom: "3", dateFormat: "unix" }).toString(),
        );
        const scores: Match[] = await res.json();
        return scores.find((s) => s.home_team === teams[0] && s.away_team === teams[1] && s.commence_time === startTime) || null;
    } catch (error) {
        console.error(
            "Error fetching match:",
            error,
            `${THE_ODDS_API_URL}/sports/${sport}/scores?` + new URLSearchParams({ apiKey: THE_ODDS_API_KEY, daysFrom: "3", dateFormat: "unix" }).toString(),
        );
        return null;
    }
}

/**
 * Creates timestamp for validation.
 * @param startTime Match start time.
 * @param teamScoreA Match team A result.
 * @param teamScoreB Match team B result.
 * @returns Timestamp.
 */
function createTimestamp(startTime: string, teamScoreA: string, teamScoreB: string): string | null {
    if (teamScoreA === "" || teamScoreB === "") {
        return null;
    }

    const resultsA = Number(teamScoreA);
    const resultsB = Number(teamScoreB);
    if (!isNumber(resultsA) || !isNumber(resultsB)) {
        return null;
    }

    return (Number(startTime) + resultsA + resultsB).toString();
}

/**
 * Checks if given value is a number.
 * @param value Value to check.
 * @returns Boolean.
 */
function isNumber(value: any): boolean {
    return typeof value === "number" && !isNaN(value);
}

/**
 * Extracts teams scores.
 * @param match Mathc object.
 * @param teamA Team A.
 * @param teamB Team B.
 * @returns Result object with numerical scores
 */
function getScores(match: Match, teamA: string, teamB: string): { resultA: string | null; resultB: string | null } {
    const scoreA = match.scores.find((c) => c.name === teamA);
    const scoreB = match.scores.find((c) => c.name === teamB);

    return {
        resultA: scoreA ? scoreA.score : null,
        resultB: scoreB ? scoreB.score : null,
    };
}

/**
 * Gets event results.
 * @param teamsString Teams string.
 * @param sportIndex Sport index.
 * @param startTime Event start time.
 * @returns Event winner & timestamp.
 */
export async function getEventResults(teamsString: string, sportIndex: string, startTime: number): Promise<{ results: string[] | null; ts: string | null }> {
    const teams = teamsString.split(",");
    const teamA = teams[0];
    const teamB = teams[1];
    const sport = getSportBySportIndex(sportIndex);

    const match = await getMatch(sport, teams, startTime);
    if (!match) {
        return { results: null, ts: null };
    }

    if (
        match.completed !== true &&
        (match.commence_time !== startTime || match.commence_time + 1 !== startTime) &&
        teamA !== match.home_team &&
        teamB !== match.away_team
    ) {
        return { results: null, ts: null };
    }

    const { resultA, resultB } = getScores(match, teamA, teamB);

    if (resultA === null || resultB === null) {
        console.error("Could not find scores for both teams");
        return { results: null, ts: null };
    }

    const scores = [resultA, resultB];
    // const ts = createTimestamp((new Date(match.commence_time).getTime() / 1000).toString(), resultA, resultB);
    const ts = match.commence_time.toString();
    return { results: scores, ts };
}
