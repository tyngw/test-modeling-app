# Test Modeling App
## What is this?
This is an application for describing test architecture in a notation similar to UML class diagrams.

## Usage
### Local execution
1. Clone the repository
2. Run `npm install` to install the dependencies
3. Run `npm start` to start the application
4. Open a web browser and navigate to `http://localhost:3000`

### Deployed application
The application is deployed at [https://tyngw.github.io/test-modeling-app/](https://tyngw.github.io/test-modeling-app/)

### Application usage
#### Keyboard shortcuts
- `Tab` to add a new element
- `Delete` to remove the selected element
- `Enter` to edit the selected element
- `Esc` to stop editing the selected element
- `Tab` in edit mode moves the focus to the next text box
- `Ctrl + Z` to undo the last action
- `Shift + Ctrl + Z` to redo the last undone action
- `Ctrl + X` to cut the selected element
- `Ctrl + C` to copy the selected element
- `Ctrl + V` to paste the copied element
- `Ctrl + ArrowLeft` to fold the children of the selected element
- `Ctrl + ArrowRight` to expand the children of the selected element

#### Menu operations
- `New` to create a new diagram. Unsaved changes will be discarded.
- `Open` to load saved data. The current data will be discarded.
- `Save as` to save the diagram data in JSON format
- `Export` to export the diagram in SVG format

## License
This project is licensed under the ApacheLicence2.0. See [LICENSE](./LICENSE) for details.