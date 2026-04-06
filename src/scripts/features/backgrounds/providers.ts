const IMAGES: Provider[] = [
    {
        optgroup: 'Default',
        options: [
            {
                name: 'Daylight',
                value: 'bonjourr-images-daylight',
            },
        ],
    },
]

const VIDEOS: Provider[] = [
    {
        optgroup: 'Default',
        options: [
            {
                name: 'Daylight',
                value: 'bonjourr-videos-daylight',
            },
        ],
    },
]

//

interface Provider {
    optgroup: string
    options: {
        name: string
        value: string
    }[]
}

export const PROVIDERS = { IMAGES, VIDEOS }
