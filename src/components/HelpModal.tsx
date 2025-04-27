import React from 'react';
import ModalWindow from './ModalWindow';
import HelpIcon from './icons/HelpIcon';
import { helpContent } from '../constants/helpContent';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <ModalWindow
      isOpen={isOpen}
      onClose={onClose}
      title="Help"
      icon={<HelpIcon />}
    >
      <div dangerouslySetInnerHTML={{ __html: helpContent }} />
    </ModalWindow>
  );
};

export default HelpModal;
