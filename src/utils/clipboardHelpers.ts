import { Element } from '../types';
import { ElementsMap } from './elementHelpers';
import { getCutElements, setCutElements } from './localStorageHelpers';

export const getSelectedAndChildren = (elements: ElementsMap, targetElement: Element): ElementsMap => {
    let cutElements: ElementsMap = {};
    const elementList = Object.values(elements);
    const rootCopy = { ...targetElement, parentId: null };
    cutElements[rootCopy.id] = rootCopy;

    const collectChildren = (parentId: string) => {
        elementList.filter(e => e.parentId === parentId).forEach(child => {
            const childCopy = { ...child };
            cutElements[childCopy.id] = childCopy;
            collectChildren(child.id);
        });
    };

    collectChildren(targetElement.id);
    return cutElements;
};

export const copyToClipboard = (elements: ElementsMap) => {
    // Store elements in localStorage for cross-tab usage
    setCutElements(JSON.stringify(elements));

    // Continue with standard text clipboard functionality
    const getElementText = (element: Element, depth: number = 0): string => {
        const children = Object.values(elements).filter(el => el.parentId === element.id);
        const childTexts = children.map(child => getElementText(child, depth + 1));
        const tabs = '\t'.repeat(depth);
        return `${tabs}${element.texts[0]}
${childTexts.join('')}`;
    };

    const selectedElement = Object.values(elements).find(el => el.selected);
    if (!selectedElement) return;
    const textToCopy = getElementText(selectedElement);

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            console.log('Copied to clipboard:', textToCopy);
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            console.log('Copied to clipboard:', textToCopy);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
        document.body.removeChild(textArea);
    }
};

export const getGlobalCutElements = (): ElementsMap | null => {
    const stored = getCutElements();
    if (!stored) return null;
    
    try {
        return JSON.parse(stored) as ElementsMap;
    } catch (e) {
        console.error('Failed to parse cut elements:', e);
        return null;
    }
};