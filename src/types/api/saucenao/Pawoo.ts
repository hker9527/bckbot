import { ResultData } from "./Base";

export interface PawooData extends ResultData {
	created_at:              string;
    pawoo_id:                number;
    pawoo_user_acct:         string;
    pawoo_user_username:     string;
    pawoo_user_display_name: string;
}