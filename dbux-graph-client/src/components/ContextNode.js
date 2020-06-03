import { compileHtmlElement, decorateClasses } from '@/util/domUtil';
import { isMouseEventPlatformModifierKey } from '@/util/keyUtil';
import { getPlatformModifierKeyString } from '@/util/platformUtil';
import ClientComponentEndpoint from '../componentLib/ClientComponentEndpoint';

class ContextNode extends ClientComponentEndpoint {
  get popperEl() {
    return window._popperEl;
  }

  createEl() {
    return compileHtmlElement(/*html*/`
      <div class="context-node flex-row">
        <div class="full-width flex-column">
          <div class="content">
            <div class="flex-row">
              <div class="flex-row">
                <button data-el="nodeToggleBtn" class="node-toggle-btn"></button>
                <div data-el="title" class="flex-row">
                  <div data-el="parentLabel" class="ellipsis-20 dbux-link"></div>
                  <div data-el="contextLabel" class="ellipsis-20 dbux-link"></div>
                </div>
                <!--div data-el="selectedTraceIcon" class="darkred">
                  &nbsp;☩
                </div-->
                &nbsp;
                <button class="highlight-btn emoji" data-el="staticContextHighlightBtn"><span>💡</span></button>
                <button data-el="prevContextBtn" class="hidden">⇦</button>
                <button data-el="nextContextBtn" class="hidden">⇨</button>
                <div class="loc-label">
                  <span data-el="locLabel" class="dbux-link"></span>
                  <span data-el="parentLocLabel" class="dbux-link"></span>
                </div>
                <div>
                  <span class="value-label" data-el="valueLabel"></span>
                </div>
              </div>
              <div class="flex-row">
              </div>
            </div>
          </div>
          <div class="full-width flex-row">
            <div class="node-left-padding">
              <div data-el="indicator" class="indicator  hidden"></div>
            </div>
            <div data-mount="ContextNode" data-el="nodeChildren" class="node-children"></div>
          </div>
        </div>
      </div>
      `);
  }

  update() {
    const {
      applicationId,
      context: { contextId, staticContextId },
      contextNameLabel,
      contextLocLabel,
      parentTraceNameLabel,
      parentTraceLocLabel,
      valueLabel,
      isSelected,
      traceId
    } = this.state;

    this.el.id = `application_${applicationId}-context_${contextId}`;
    this.el.style.background = `hsl(${this.getBinaryHsl(staticContextId)},50%,85%)`;
    // this.els.title.id = `name_${contextId}`;
    // this.els.nodeChildren.id = `children_${contextId}`;
    this.els.contextLabel.textContent = contextNameLabel;
    this.els.locLabel.textContent = contextLocLabel;
    this.els.parentLabel.textContent = parentTraceNameLabel || '';
    this.els.parentLocLabel.textContent = parentTraceLocLabel || '';
    this.els.valueLabel.textContent = valueLabel;
    decorateClasses(this.els.title, {
      darkred: isSelected
    });

    // set indicator
    this.setIndicator(traceId, this.children.getComponents('ContextNode'));

    // set popper
    const modKey = getPlatformModifierKeyString();
    this.els.contextLabel.setAttribute('data-tooltip', `${this.els.contextLabel.textContent} (${modKey} + click to follow)`);
    this.els.parentLabel.setAttribute('data-tooltip', `${this.els.parentLabel.textContent} (${modKey} + click to follow)`);
    this.els.prevContextBtn.setAttribute('data-tooltip', 'Go to previous function execution');
    this.els.nextContextBtn.setAttribute('data-tooltip', 'Go to next function execution');
  }

  getBinaryHsl(i) {
    let color = 0;
    let base = 180;
    while (i !== 0) {
      color += (i % 2) * base;
      i = Math.floor(i / 2);
      base /= 2;
    }
    return color;
  }

  // ########################################
  // handle label on click
  // ########################################

  handleClickOnContext(evt) {
    if (isMouseEventPlatformModifierKey(evt)) {
      if (evt.shiftKey) {
        // ctrl(meta) + shift + click: select trace
        this.remote.selectFirstTrace();
        document.getSelection().removeAllRanges();
      }
      else {
        // ctrl(meta) + click: show trace
        this.remote.goToFirstTrace();
      }
    }
  }

  handleClickOnParentTrace(evt) {
    if (isMouseEventPlatformModifierKey(evt)) {
      if (evt.shiftKey) {
        // ctrl(meta) + shift + click: select trace
        this.remote.selectParentTrace();
        document.getSelection().removeAllRanges();
      }
      else {
        // ctrl(meta) + click: show trace
        this.remote.goToParentTrace();
      }
    }
  }

  setIndicator(TraceId, children) {
    // mode != GraphNodeMode.Collapsed
    let graphNodeMode = this.controllers.getComponent('GraphNode')?.state.mode;
    if (graphNodeMode !== 1 && children && TraceId) {
      // check traceId > or < context children's traceId -del
      let childrenContextId = children.map((x) => x.state.parentTraceId).findIndex(x => x >= TraceId);

      if (childrenContextId !== -1) {
        let toggleBounds = children[childrenContextId].el.getBoundingClientRect();
        //container -> nodeChildren element
        let containerBounds = this.els.nodeChildren.getBoundingClientRect();

        this.els.indicator.style?.removeProperty('bottom');
        this.els.indicator.style.top = `${toggleBounds.top - containerBounds.top}px`;
      } else {
        //when traceId bigger than all children's traceId -del
        this.els.indicator.style?.removeProperty('top');
        this.els.indicator.style.bottom = '0px';
      }
      this.els.indicator.classList.remove('hidden');
    } else {
      //Trace deselect
      this.els.indicator.classList.add('hidden');
    }
  }

  on = {
    contextLabel: {
      click(evt) {
        this.handleClickOnContext(evt);
      }
    },
    locLabel: {
      click(evt) {
        this.handleClickOnContext(evt);
      }
    },
    parentLabel: {
      click(evt) {
        this.handleClickOnParentTrace(evt);
      }
    },
    parentLocLabel: {
      click(evt) {
        this.handleClickOnParentTrace(evt);
      }
    },
    staticContextHighlightBtn: {
      click(evt) {
        this.remote.toggleStaticContextHighlight();
      }
    },
    prevContextBtn: {
      click(evt) {
        this.remote.selectPreviousContextByStaticContext();
      }
    },
    nextContextBtn: {
      click(evt) {
        this.remote.selectNextContextByStaticContext();
      }
    }
  }
}
export default ContextNode;