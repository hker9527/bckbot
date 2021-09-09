// Generated by https://quicktype.io
//
// To change quicktype's target language, run command:
//
//   "Set quicktype target language"

export type KonachanApiResponse = KonachanPost[];

interface KonachanPost {
    id:                    number;
    tags:                  string;
    created_at:            number;
    creator_id:            number;
    author:                string;
    change:                number;
    source:                string | null;
    score:                 number;
    md5:                   string;
    file_size:             number;
    file_url:              string;
    is_shown_in_index:     boolean;
    preview_url:           string;
    preview_width:         number;
    preview_height:        number;
    actual_preview_width:  number;
    actual_preview_height: number;
    sample_url:            string;
    sample_width:          number;
    sample_height:         number;
    sample_file_size:      number;
    jpeg_url:              string;
    jpeg_width:            number;
    jpeg_height:           number;
    jpeg_file_size:        number;
    rating:                Rating;
    has_children:          boolean;
    parent_id:             number | null;
    status:                Status;
    width:                 number;
    height:                number;
    is_held:               boolean;
    frames_pending_string: string;
    frames_pending:        any[];
    frames_string:         string;
    frames:                any[];
    flag_detail?:          null;
}

enum Rating {
    Explicit = "e",
    Questionable = "q",
    Safe = "s",
}

enum Status {
    Active = "active",
    Pending = "pending",
}
