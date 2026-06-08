export function parseConvertors(convertorsStr) {
    if (!convertorsStr) return [];
    const identity = x => x;
    return convertorsStr.split(';').map(cv => {
        if (cv.includes(',')) {
            const parts = cv.split(',');
            if (parts[0] === '1' && parts[1] === '1') return identity;
            const numerator = parseFloat(parts[0]);
            const denominator = parseFloat(parts[1]);
            const addend = parts.length > 2 ? parseFloat(parts[2]) : 0;
            return x => (x * numerator / denominator) + addend;
        }
        if (cv === '1/x') return x => 1 / x;
        const expression = cv.replace(/[^-\d/*+.()%xe]/g, '');
        // eslint-disable-next-line no-new-func
        const compiled = new Function('x', `return ${expression}`);
        return x => compiled(x);
    });
}
