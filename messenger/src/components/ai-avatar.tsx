
import * as React from 'react';

import type { SVGProps } from 'react';

export type AvatarProps = {
    name: string;
    colors: string[];
    title?: boolean;
    square?: boolean;
    size?: number | string;
} & SVGProps<SVGSVGElement>;


const ELEMENTS = 3;
const SIZE = 80;

function hashCode(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        const character = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

function getDigit(number: number, ntn: number) {
    return Math.floor((number / Math.pow(10, ntn)) % 10);
}

function getBoolean(number: number, ntn: number) {
    return (!((getDigit(number, ntn)) % 2))
}

function getUnit(number: number, range: number, index?: number) {
    const value = number % range

    if (index && ((getDigit(number, index) % 2) === 0)) {
        return -value
    } else return value
}

function getRandomColor(number: number, colors: string[], range: number) {
    return colors[(number) % range]
}

export const getContrast = (hexcolor: string): string => {

    // If a leading # is provided, remove it
    if (hexcolor.slice(0, 1) === '#') {
        hexcolor = hexcolor.slice(1);
    }

    // Convert to RGB value
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);

    // Get YIQ ratio
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    // Check contrast
    return (yiq >= 128) ? '#000000' : '#FFFFFF';

};

function generateColors(name: string, colors: string[]) {
    const numFromName = hashCode(name);
    const range = colors && colors.length;

    const elementsProperties = Array.from({ length: ELEMENTS }, (_, i) => ({
        color: getRandomColor(numFromName + i, colors, range),
        translateX: getUnit(numFromName * (i + 1), SIZE / 10, 1),
        translateY: getUnit(numFromName * (i + 1), SIZE / 10, 2),
        scale: 1.2 + getUnit(numFromName * (i + 1), SIZE / 20) / 10,
        rotate: getUnit(numFromName * (i + 1), 360, 1),
    }));

    return elementsProperties;
}

function generateData(name: string, colors: string[]) {
    const numFromName = hashCode(name);
    const range = colors && colors.length;
    const wrapperColor = getRandomColor(numFromName, colors, range);
    const preTranslateX = getUnit(numFromName, 10, 1);
    const wrapperTranslateX = preTranslateX < 5 ? preTranslateX + SIZE / 9 : preTranslateX;
    const preTranslateY = getUnit(numFromName, 10, 2);
    const wrapperTranslateY = preTranslateY < 5 ? preTranslateY + SIZE / 9 : preTranslateY;

    const data = {
        wrapperColor: wrapperColor,
        faceColor: getContrast(wrapperColor),
        backgroundColor: getRandomColor(numFromName + 13, colors, range),
        wrapperTranslateX: wrapperTranslateX,
        wrapperTranslateY: wrapperTranslateY,
        wrapperRotate: getUnit(numFromName, 360),
        wrapperScale: 1 + getUnit(numFromName, SIZE / 12) / 10,
        isMouthOpen: getBoolean(numFromName, 2),
        isCircle: getBoolean(numFromName, 1),
        eyeSpread: getUnit(numFromName, 5),
        mouthSpread: getUnit(numFromName, 3),
        faceRotate: getUnit(numFromName, 10, 3),
        faceTranslateX:
            wrapperTranslateX > SIZE / 6 ? wrapperTranslateX / 2 : getUnit(numFromName, 8, 1),
        faceTranslateY:
            wrapperTranslateY > SIZE / 6 ? wrapperTranslateY / 2 : getUnit(numFromName, 7, 2),
    };

    return data;
}

const AIAvatar = ({ name, colors, title, square, size, ...otherProps }: AvatarProps) => {
    const properties = generateColors(name, colors);
    const maskID = React.useId();
    const data = generateData(name, colors);

    return (
        <svg
            viewBox={'0 0 ' + SIZE + ' ' + SIZE}
            fill="none"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            {...otherProps}
        >
            {title && <title>{name}</title>}
            <mask id={maskID} maskUnits="userSpaceOnUse" x={0} y={0} width={SIZE} height={SIZE}>
                <rect width={SIZE} height={SIZE} rx={square ? undefined : SIZE * 2} fill="#FFFFFF" />
            </mask>
            <g mask={`url(#${maskID})`}>
                <rect width={SIZE} height={SIZE} fill={properties[0].color} />
                <path
                    filter={`url(#filter_${maskID})`}
                    d="M32.414 59.35L50.376 70.5H72.5v-71H33.728L26.5 13.381l19.057 27.08L32.414 59.35z"
                    fill={properties[1].color}
                    transform={
                        'translate(' +
                        properties[1].translateX +
                        ' ' +
                        properties[1].translateY +
                        ') rotate(' +
                        properties[1].rotate +
                        ' ' +
                        SIZE / 2 +
                        ' ' +
                        SIZE / 2 +
                        ') scale(' +
                        properties[2].scale +
                        ')'
                    }
                />
                <path
                    filter={`url(#filter_${maskID})`}
                    style={{
                        mixBlendMode: 'overlay',
                    }}
                    d="M22.216 24L0 46.75l14.108 38.129L78 86l-3.081-59.276-22.378 4.005 12.972 20.186-23.35 27.395L22.215 24z"
                    fill={properties[2].color}
                    transform={
                        'translate(' +
                        properties[2].translateX +
                        ' ' +
                        properties[2].translateY +
                        ') rotate(' +
                        properties[2].rotate +
                        ' ' +
                        SIZE / 2 +
                        ' ' +
                        SIZE / 2 +
                        ') scale(' +
                        properties[2].scale +
                        ')'
                    }
                />

                {/** Face */}
                <g mask={`url(#${maskID})`}>
                    <rect width={SIZE} height={SIZE} />
                    <rect
                        x="0"
                        y="0"
                        width={SIZE}
                        height={SIZE}
                        transform={
                            'translate(' +
                            data.wrapperTranslateX +
                            ' ' +
                            data.wrapperTranslateY +
                            ') rotate(' +
                            data.wrapperRotate +
                            ' ' +
                            SIZE / 2 +
                            ' ' +
                            SIZE / 2 +
                            ') scale(' +
                            data.wrapperScale +
                            ')'
                        }
                        rx={data.isCircle ? SIZE : SIZE / 6}
                    />
                    <g
                        transform={
                            'translate(' +
                            data.faceTranslateX +
                            ' ' +
                            data.faceTranslateY +
                            ') rotate(' +
                            data.faceRotate +
                            ' ' +
                            SIZE / 2 +
                            ' ' +
                            SIZE / 2 +
                            ') scale(2.5)'
                        }
                    >
                        {data.isMouthOpen ? (
                            <path
                                d={'M15 ' + (19 + data.mouthSpread) + 'c2 1 4 1 6 0'}
                                stroke={data.faceColor}
                                fill="none"
                                strokeLinecap="round"
                            />
                        ) : (
                            <path
                                d={'M13,' + (19 + data.mouthSpread) + ' a1,0.75 0 0,0 10,0'}
                                fill={data.faceColor}
                            />
                        )}
                        <rect
                            x={14 - data.eyeSpread}
                            y={14}
                            width={1.5}
                            height={2}
                            rx={1}
                            stroke="none"
                            fill={data.faceColor}
                        />
                        <rect
                            x={20 + data.eyeSpread}
                            y={14}
                            width={1.5}
                            height={2}
                            rx={1}
                            stroke="none"
                            fill={data.faceColor}
                        />
                    </g>
                </g>
            </g>
            <defs>
                <filter
                    id={`filter_${maskID}`}
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                >
                    <feFlood floodOpacity={0} result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation={7} result="effect1_foregroundBlur" />
                </filter>
            </defs>
        </svg>
    );
};

export default AIAvatar;