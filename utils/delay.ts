export const delay = (x: number) => new Promise<void>((resolve) => setTimeout(() => {
    resolve()
}, x))