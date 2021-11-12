import { ResultData } from "./Base";

export interface MoebooruData extends ResultData {
	danbooru_id?: number;
	gelbooru_id?: number;
	konachan_id?: number;
	yandere_id?:  number;
	sankaku_id?:  number;
	creator:      string;
    material:     string;
    characters:   string;
    source:       string;
}