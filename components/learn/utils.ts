export const tryParseQuestions = (content: string) => {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) {
            return parsed;
        }
    } catch { return null; }
    return null;
};
