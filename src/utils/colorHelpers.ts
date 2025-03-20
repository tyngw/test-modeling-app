// 色の明るさを判定し、適切なテキスト色を返す関数
export const getAppropriateTextColor = (backgroundColor: string): string => {
  // HEX形式の色をRGBに変換
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    // #RGBまたは#RRGGBBの形式でない場合は処理しない
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const formattedHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(formattedHex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // 色の明るさを計算（W3C方式）
  const getColorBrightness = (rgb: { r: number; g: number; b: number }): number => {
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  };

  // RGBに変換できない場合はデフォルトの黒を返す
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';
  
  // 明るさが128（中間値）より低い場合は白、高い場合は黒
  const brightness = getColorBrightness(rgb);
  return brightness < 128 ? '#ffffff' : '#000000';
};