import { ResultData } from "./Base";

export interface AnimeData extends ResultData {
	source:    string;
    anidb_aid: number;
    part:      string;
    year:      string;
    est_time:  string;
}