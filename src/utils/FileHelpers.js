// utils/FileHelpers.js
export const loadNodes = (event) => {
    return new Promise((resolve, reject) => {
        const file = event.target.files[0];
        if (file) {
            const fileName = file.name;
            const fileExtension = fileName.slice((fileName.lastIndexOf(".") - 1 >>> 0) + 2);
            if (fileExtension !== 'json') {
                throw new Error('Error: .json拡張子のファイルを選択してください');
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                const contents = e.target.result;
                try {
                    const nodes = JSON.parse(contents);
                    resolve(nodes);
                } catch (error) {
                    throw new Error('Error: ファイルの読み込みに失敗しました');
                }
            };
            reader.readAsText(file);
        }
        event.target.value = null;
    });
}

export const saveSvg = (svgElement, name) => {
    const svgElementClone = svgElement.cloneNode(true);

    svgElementClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const elements = svgElement.querySelectorAll('*');
    const clonedElements = svgElementClone.querySelectorAll('*');

    // 各要素に対してループを行います
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const clonedElement = clonedElements[i];

        // 元の要素の計算されたスタイルを取得します
        const computedStyle = window.getComputedStyle(element);

        // 計算されたスタイルを複製した要素のstyle属性に設定します
        for (let j = 0; j < computedStyle.length; j++) {
            const styleName = computedStyle[j];
            const styleValue = computedStyle.getPropertyValue(styleName);
            clonedElement.style[styleName] = styleValue;
        }
    }

    // SVG要素を文字列に変換します
    const svgData = svgElementClone.outerHTML;
    const preface = '<?xml version="1.0" standalone="no"?>\r\n';
    const svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = name;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

export const saveNodes = (nodes) => {
    const rootText = nodes.find(node => node.parentId === null).text;
    const fileName = rootText || 'Untitled';

    const nodesToSave = nodes.map(node => {
        const { x, y, ...nodeWithoutXY } = node;
        return nodeWithoutXY;
    });

    const json = JSON.stringify(nodesToSave);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${fileName}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}