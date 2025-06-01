# Test Modeling App

## What is this?

This is an application for describing test architecture in a notation similar to UML class diagrams.

## Usage

### Local execution

1. Clone the repository
2. Run `npm install` to install the dependencies
3. Run `npm start` to start the application
4. Open a web browser and navigate to `http://localhost:3000`

### Deployment to GitHub Pages

If you push to the main branch, the application will be automatically deployed.

### Deployed application

The application is deployed at [https://tyngw.github.io/test-modeling-app/](https://tyngw.github.io/test-modeling-app/)

### Application usage

#### Keyboard shortcuts

- `Tab`: Add a child element to the selected element
- `Delete`: Remove the selected element
- `Enter`: Edit the selected element
- `Esc`: Stop editing the selected element
- `Tab` in editing mode: Move the focus to the next text box
- `Ctrl + Z`: Undo the last action
- `Shift + Ctrl + Z`: Redo the last action
- `Ctrl + X`: Cut the selected element
- `Ctrl + C`: Copy the selected element
- `Ctrl + V`: Paste the copied element
- `Ctrl + ArrowLeft`: Collapse the children of the selected element
- `Ctrl + ArrowRight`: Expand the children of the selected element

#### Mouse operations

- `Click`: Select an element
- `Double click`: Edit the selected element
  - Clicking outside the element will end the editing mode
- `Drag`: Move the selected element

#### Menu operations

- `New`: Create a new diagram. Unsaved changes will be discarded.
- `Open`: Load saved data. The current data will be discarded.
- `Save as`: Save the diagram data in JSON format
- `Export`: Export the diagram in SVG format

## Security

This application implements comprehensive XSS (Cross-Site Scripting) protection measures:

### Implemented Security Features

- **Input Sanitization**: All user inputs are sanitized to remove dangerous HTML tags, JavaScript protocols, and event handlers
- **Input Validation**: Real-time validation of user input with dangerous content rejection
- **File Upload Security**: Multi-layer validation for file uploads including filename sanitization, size limits, and content verification
- **API Response Sanitization**: All AI API responses are sanitized before processing
- **Storage Security**: localStorage operations include size limits and validation with encrypted API key storage
- **CSP Headers**: Content Security Policy and other security headers to prevent various attack vectors

For detailed security information, please see [SECURITY.md](./SECURITY.md).

## License

This project is licensed under the MIT license. See [LICENSE](./LICENSE) for details.
