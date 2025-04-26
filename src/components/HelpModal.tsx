import React from 'react';
import ModalWindow from './ModalWindow';
import HelpIcon from './icons/HelpIcon';
import { helpContent } from '../constants/helpContent';
import { getCurrentTheme } from '../utils/style/colorHelpers';
import { getCanvasBackgroundColor } from '../utils/storage/localStorageHelpers';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const currentTheme = getCurrentTheme(getCanvasBackgroundColor());
  return (
    <ModalWindow
      isOpen={isOpen}
      onClose={onClose}
      title="Help"
      icon={<HelpIcon bgColor={`${currentTheme.MODAL.TEXT_COLOR}15`} iconColor={currentTheme.MODAL.TEXT_COLOR} />}
    >
      <div dangerouslySetInnerHTML={{ __html: helpContent }} />
    </ModalWindow>
  );
};

export default HelpModal;
