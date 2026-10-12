export interface Review {
    reviewer: string;
    rating: number;
    crisp: number;
    comment: string;
}

export interface Restaurant {
    id: number;
    name: string;
    zone: string;
    address: string;
    rating: number;
    crispness: number;
    menu: string;
    image: string;
    badge?: string;
    isClosed?: boolean;
    reviews: Review[];
}