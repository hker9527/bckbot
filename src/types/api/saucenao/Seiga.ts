import { ResultData } from "./Base";

export interface SeigaData extends ResultData {
	title:       string;
    seiga_id:    number;
    member_name: string;
    member_id:   number;
}