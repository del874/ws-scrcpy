/**
 * URL参数处理工具函数
 */

/**
 * 解析URL hash参数
 * @param hash - URL hash字符串
 * @returns URLSearchParams对象
 */
export const parseHashParams = (hash: string): URLSearchParams => {
    // 去除#!/前缀
    const cleanHash = hash.replace(/^#!/, '');
    // 将hash转换为URLSearchParams对象
    return new URLSearchParams(cleanHash);
};

/**
 * 构建带有参数的hash URL
 * @param baseUrl - 基础URL
 * @param params - 参数对象
 * @returns 完整的URL字符串
 */
export const buildHashUrl = (baseUrl: string, params: Record<string, string>): string => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.append(key, value);
        }
    });

    return `${baseUrl}#!${searchParams.toString()}`;
};