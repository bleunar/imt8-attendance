
/**
 * Utility to fetch available departments.
 * Currently returns a static list, but can be updated to fetch from API.
 */
export const getDepartments = (): string[] => {
    return [
        'ITSD',
        'CITE',
        'GSD',
        'Human Resources',
        'Library',
        'Maintenance',
        'Registrar',
        'Others',
    ];
};
