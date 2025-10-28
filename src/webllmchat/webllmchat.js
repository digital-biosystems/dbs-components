import * as webllm from '@mlc-ai/web-llm';
import { marked} from 'marked';

@customElement('dbs-webllmchat')
export class Webllmchat {

    /*************** WebLLM logic ***************/
    messages = []; availableModels = []; selectedModel = "";

    bound() {
        this.placeholder = "Type a message..."
        this.chatclass = "chat-stats hidden";
        this.availableModels = webllm.prebuiltAppConfig.model_list.map(
            (m) => m.model_id,
        );
        this.selectedModel = "Qwen3-0.6B-q4f16_1-MLC";
        this.messages = [
            {
                content: "You are a helpful AI agent helping users proficient in medicine and healthcare. Answer the questions as accurately as possible. If you don't know the answer, just say that you don't know, don't try to make up an answer.",
                role: "system",
            }];
        this.engine = new webllm.MLCEngine();
        this.engine.setInitProgressCallback(this.updateEngineInitProgressCallback.bind(this));
        this.isdisabled = true;

    }

    clickDownload() {
        this.initializeWebLLMEngine().then(() => {
            this.isdisabled = false;
        });
    }

    clickSend() {
        this.onMessageSend();
    }


    attached() {
        /*************** UI binding ***************/
        this.availableModels.forEach((modelId) => {
            const option = document.createElement("option");
            option.value = modelId;
            option.textContent = modelId;
            this.modelSelection.appendChild(option);
        });
        //document.getElementById("model-selection").value = selectedModel;
    }
    // Callback function for initializing progress
    updateEngineInitProgressCallback(report) {
        //this.reportText = report.text;
        console.log("initialize", report);
        this.progressPercent = Math.max(0, Math.min(1, parseFloat(report.progress))) * 100;
        this.reporttext = report.text;
        //document.getElementById("download-status").textContent = report.text;
    }

    // Create engine instance
    dsclass = "hidden";

    async initializeWebLLMEngine() {
        this.dsclass = "w3-tiny";//document.getElementById("download-status").classList.remove("hidden");
        //this.selectedModel = document.getElementById("model-selection").value;
        const config = {
            temperature: 1.0,
            top_p: 1,
        };
        console.log("Initializing model:", this.selectedModel);
        await this.engine.reload(this.selectedModel, config);
    }

    async streamingGenerating(messages) {//, onUpdate, onFinish, onError) {
        //updateLastMessage,            onFinishGenerating,            console.error,        );
        try {
            this.curMessage = "";
            console.log("Starting streaming generation...");
            this.completion = await this.engine.chat.completions.create({
                stream: true,
                messages,
            });
            for await (const chunk of this.completion) {
                const curDelta = chunk.choices[0].delta.content;
                if (curDelta) {
                    this.curMessage += curDelta;
                }
                this.updateLastMessage(this.curMessage);
            }
            const finalMessage = await this.engine.getMessage();

            this.onFinishGenerating(finalMessage);
        } catch (err) {
            console.error(err);
        }
    }

    /*************** UI logic ***************/
    onMessageSend() {
        //const input = document.getElementById("user-input").value.trim();
        this.input = this.userinput.trim()
        const message = {
            content: this.input,
            role: "user",
        };

        if (this.input.length === 0) {
            return;
        }
        this.isdisabled = true;

        this.messages.push(message);
        this.appendMessage(message);

        this.userinput = "";//document.getElementById("user-input").value = "";
        this.placeholder = "Generating...";

        const aiMessage = {
            content: "typing...",
            role: "assistant",
        };
        this.appendMessage(aiMessage);

        this.streamingGenerating(
            this.messages);//,            updateLastMessage,            onFinishGenerating,            console.error,        );
    }
    onFinishGenerating(finalMessage) {
        this.updateLastMessage(finalMessage);
        //console.log("Generation finished:", finalMessage);
        this.isdisabled = false;
        this.engine.runtimeStatsText().then(statsText => {
            this.statsText = statsText;
            this.chatclass = "chat-stats";//document.getElementById('chat-stats').classList.remove('hidden');
            //document.getElementById('chat-stats').textContent = statsText;
        })
    }

    appendMessage(message) {
        //this.chatbox = document.getElementById("chat-box");
        const container = document.createElement("div");
        container.classList.add("message-container");
        const newMessage = document.createElement("div");
        newMessage.classList.add("message");
        newMessage.textContent = message.content;

        if (message.role === "user") {
            container.classList.add("user");
        } else {
            container.classList.add("assistant");
        }

        container.appendChild(newMessage);
        this.chatbox.appendChild(container);
        this.chatbox.scrollTop = this.chatbox.scrollHeight; // Scroll to the latest message
    }

    updateLastMessage(content) {
        const messageDoms = this.chatbox
            .querySelectorAll(".message");
        const lastMessageDom = messageDoms[messageDoms.length - 1];
        //lastMessageDom.textContent = content;
        //marked parsing with custom think tag handling
        const enhancedContent = content.replace(/<think>([\s\S]*?)<\/think>/g,
  (_, inner) => `<div class="reasoning-block">${inner}</div>`
);
        lastMessageDom.innerHTML = marked.parse(enhancedContent);

    }


}