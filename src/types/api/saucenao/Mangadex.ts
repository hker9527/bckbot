import { ResultData } from "./Base";

export interface MangadexData extends ResultData {
	md_id:    number; // "https://mangadex.org/chapter/{{id}}"
    mu_id?:   number; // "https://www.mangaupdates.com/series.html?id={{id}}"
    mal_id?:  number; // "https://myanimelist.net/manga/{{id}}/"
    source:   string;
    part:     string;
    artist:   string;
    author:   string;
}