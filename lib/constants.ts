export const ADMIN_EMAILS = ["kruheemschool@gmail.com"];

export const SITE_CONFIG = {
    name: "KruHeem Course",
    description: "เรียนคณิตศาสตร์ออนไลน์กับครูฮีม",
    links: {
        facebook: "https://m.me/kruheemschool",
    }
};

// Single source of truth for where students transfer money. Used by the main
// checkout (/payment) AND the PDF-exam checkout so both show identical details.
// Change the account here → it updates everywhere.
export const PAYMENT_INFO = {
    accountName: "นายสุเทพ โชติมานิต",
    qrImage: "/qrcode.png",
    accounts: [
        { label: "พร้อมเพย์", value: "082-705-7440" },
        { label: "กสิกรไทย (ออมทรัพย์)", value: "391-2-78364-1", note: "สาขา เซ็นทรัลรัตนาธิเบศร์" },
    ] as { label: string; value: string; note?: string }[],
};
