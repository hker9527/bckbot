import { ResultData } from "./Base";

export interface PixivData extends ResultData {
	title:       string;
    pixiv_id:    number;
    member_name: string;
    member_id:   number;
}