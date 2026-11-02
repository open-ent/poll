/*
 * Copyright © Région Nord Pas de Calais-Picardie,  Département 91, Région Aquitaine-Limousin-Poitou-Charentes, 2016.
 *
 * This file is part of OPEN ENT NG. OPEN ENT NG is a versatile ENT Project based on the JVM and ENT Core Project.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation (version 3 of the License).
 *
 * For the sake of explanation, any module that communicate over native
 * Web protocols, such as HTTP, with OPEN ENT NG is outside the scope of this
 * license and could be license under its own terms. This is merely considered
 * normal use of OPEN ENT NG, and does not fall under the heading of "covered work".
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

package net.atos.entng.poll.controllers;

import java.util.Map;

import fr.wseduc.webutils.I18n;
import net.atos.entng.poll.Poll;

import org.entcore.common.events.EventHelper;
import org.entcore.common.events.EventStore;
import org.entcore.common.events.EventStoreFactory;
import org.entcore.common.mongodb.MongoDbControllerHelper;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;
import io.vertx.core.Handler;
import io.vertx.core.Vertx;
import io.vertx.core.http.HttpServerRequest;
import org.vertx.java.core.http.RouteMatcher;
import io.vertx.core.json.JsonObject;


import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Delete;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Post;
import fr.wseduc.rs.Put;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.request.RequestUtils;

/**
 * Controller to manage URL paths for polls.
 * @author Atos
 */
public class PollController extends MongoDbControllerHelper {
    static final String RESOURCE_NAME = "poll";
	private EventHelper eventHelper;

	@Override
	public void init(Vertx vertx, JsonObject config, RouteMatcher rm,
			Map<String, fr.wseduc.webutils.security.SecuredAction> securedActions) {
		super.init(vertx, config, rm, securedActions);
	}

    /**
     * Default constructor.
     * @param collection MongoDB collection to request.
     */
    public PollController(String collection) {
        super(collection);
        final EventStore eventStore = EventStoreFactory.getFactory().getEventStore(Poll.class.getSimpleName());
        this.eventHelper = new EventHelper(eventStore);
    }

    @Get("")
    @SecuredAction("poll.view")
    public void view(HttpServerRequest request) {
        withUi(request, ui -> {
            if ("react".equals(ui)) {
                renderView(request, new JsonObject(), "poll-react.html", null);
            } else {
                renderView(request);
            }
        });

		// Create event "access to application Poll" and store it, for module "statistics"
		eventHelper.onAccess(request);
    }

    /**
     * IHM servie par défaut, en l'absence de choix de l'usager : React, sauf si la plateforme demande {@code frontend-ui: angular}.
     * L'ancienne interface s'obtient par {@code ?ui=angular} ou par la préférence de l'usager.
     */
    static String platformUi(final JsonObject config) {
        return "angular".equals(config.getString("frontend-ui")) ? "angular" : "react";
    }

    /** Clé de préférence usager portant le choix d'IHM. */
    private static final String UI_PREFERENCE = "pollUi";

    /** `?ui=react|angular` dans l'adresse, sinon la préférence de l'usager, sinon le défaut de la plateforme. */
    private void withUi(final HttpServerRequest request, final Handler<String> handler) {
        final String platform = platformUi(config);
        final String forced = request.getParam("ui");
        if ("react".equals(forced) || "angular".equals(forced)) {
            handler.handle(forced);
            return;
        }
        UserUtils.getUserInfos(eb, request, user -> {
            if (user == null) {
                handler.handle(platform);
                return;
            }
            // Syntaxe OpenCypher (`$userId`, ArcadeDB) d'abord ; un Neo4j épinglé en Cypher 2.3 la refuse : on retente avec l'ancienne.
            final String tail = "-[:PREFERS]->(uac:UserAppConf) RETURN uac." + UI_PREFERENCE + " AS preference";
            final JsonObject params = new JsonObject().put("userId", user.getUserId());
            try {
                final org.entcore.common.neo4j.Neo4j neo4j = org.entcore.common.neo4j.Neo4j.getInstance();
                neo4j.execute("MATCH (:User {id:$userId})" + tail, params, message -> {
                    if (isOk(message.body())) {
                        handler.handle(readUi(message.body(), platform));
                    } else {
                        neo4j.execute("MATCH (:User {id:{userId}})" + tail, params, legacy -> handler.handle(readUi(legacy.body(), platform)));
                    }
                });
            } catch (Exception e) {
                handler.handle(platform);
            }
        });
    }

    /** Une réponse Neo4j réussie porte « status: ok ». */
    static boolean isOk(JsonObject body) {
        return body != null && "ok".equals(body.getString("status"));
    }

    /** Extrait le choix d'IHM du résultat Neo4j — la préférence y est rangée en CHAÎNE JSON, ex. {"ui":"react"}. */
    static String readUi(JsonObject body, String platformUi) {
        try {
            final io.vertx.core.json.JsonArray rows = body.getJsonArray("result", new io.vertx.core.json.JsonArray());
            if (rows.isEmpty()) return platformUi;
            final String raw = rows.getJsonObject(0).getString("preference");
            if (raw == null || raw.trim().isEmpty()) return platformUi;
            final String ui = new JsonObject(raw).getString("ui");
            return ("react".equals(ui) || "angular".equals(ui)) ? ui : platformUi;
        } catch (Exception e) {
            return platformUi;
        }
    }

    @Override
    @Get("/list/all")
    @ApiDoc("Allows to list all polls")
    @SecuredAction("poll.list")
    public void list(HttpServerRequest request) {
        super.list(request);
    }

    @Override
    @Post("")
    @ApiDoc("Allows to create a new poll")
    @SecuredAction("poll.create")
    public void create(final HttpServerRequest request) {
        RequestUtils.bodyToJson(request, pathPrefix + "poll", new Handler<JsonObject>() {

            @Override
            public void handle(JsonObject event) {
                PollController.super.create(request, r -> {
                    if(r.succeeded()){
                        eventHelper.onCreateResource(request, RESOURCE_NAME);
                    }
                });
            }
        });
    }

    @Override
    @Get("/:id")
    @ApiDoc("Allows to get a poll associated to the given identifier")
    @SecuredAction(value = "poll.read", type = ActionType.RESOURCE)
    public void retrieve(HttpServerRequest request) {
        super.retrieve(request);
    }

    @Override
    @Put("/:id")
    @ApiDoc("Allows to update a poll associated to the given identifier")
    @SecuredAction(value = "poll.manager", type = ActionType.RESOURCE)
    public void update(final HttpServerRequest request) {
        RequestUtils.bodyToJson(request, pathPrefix + "poll", new Handler<JsonObject>() {

            @Override
            public void handle(JsonObject event) {
                PollController.super.update(request);
            }
        });
    }

    @Put("/vote/:id")
    @ApiDoc("Allows to vote to the poll associated to the given identifier")
    @SecuredAction(value = "poll.contrib", type = ActionType.RESOURCE)
    public void vote(HttpServerRequest request) {
        update(request);
    }

    @Override
    @Delete("/:id")
    @ApiDoc("Allows to delete a poll associated to the given identifier")
    @SecuredAction(value = "poll.manager", type = ActionType.RESOURCE)
    public void delete(HttpServerRequest request) {
        super.delete(request);
    }

    @Get("/share/json/:id")
    @ApiDoc("Allows to get the current sharing of the poll given by its identifier")
    @SecuredAction(value = "poll.manager", type = ActionType.RESOURCE)
    public void share(HttpServerRequest request) {
        shareJson(request, false);
    }

    @Put("/share/json/:id")
    @ApiDoc("Allows to update the current sharing of the poll given by its identifier")
    @SecuredAction(value = "poll.manager", type = ActionType.RESOURCE)
    public void sharePollSubmit(final HttpServerRequest request) {
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>(){
            @Override
            public void handle(final UserInfos user){
                if (user != null) {
                    final String id = request.params().get("id");
                    if (id == null || id.trim().isEmpty()) {
                        badRequest(request);
                        return;
                    }

                    JsonObject params = new JsonObject();
                    params.put("uri", "/userbook/annuaire#" + user.getUserId() + "#" + user.getType())
                    .put("username", user.getUsername())
                    .put("pollUri",  "/poll#/view/" + id);
                    params.put("resourceUri", params.getString("pollUri"));
                    params.put("pushNotif", new JsonObject().put("title", "poll.notification.shared")
                            .put("body", I18n.getInstance()
                                    .translate(
                                            "poll.notification.shared.two",
                                            getHost(request),
                                            I18n.acceptLanguage(request),
                                            user.getUsername()
                                    )));

                    shareJsonSubmit(request, "poll.share", false, params, "question");
                }
            }
        });
    }

    @Put("/share/remove/:id")
    @ApiDoc("Allows to remove the current sharing of the poll given by its identifier")
    @SecuredAction(value = "poll.manager", type = ActionType.RESOURCE)
    public void removeSharePoll(HttpServerRequest request) {
        removeShare(request, false);
    }

    @Put("/share/resource/:id")
    @ApiDoc("Allows to update the current sharing of the poll given by its identifier")
    @SecuredAction(value = "poll.manager", type = ActionType.RESOURCE)
    public void shareResource(final HttpServerRequest request) {
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    final String id = request.params().get("id");
                    if(id == null || id.trim().isEmpty()) {
                        badRequest(request, "invalid.id");
                        return;
                    }

                    JsonObject params = new JsonObject();
                    params.put("uri", "/userbook/annuaire#" + user.getUserId() + "#" + user.getType())
                            .put("username", user.getUsername())
                            .put("pollUri",  "/poll#/view/" + id);
                    params.put("resourceUri", params.getString("pollUri"));
                    params.put("pushNotif", new JsonObject().put("title", "poll.notification.shared")
                            .put("body", I18n.getInstance()
                                    .translate(
                                            "poll.notification.shared.two",
                                            getHost(request),
                                            I18n.acceptLanguage(request),
                                            user.getUsername()
                                    )));

                    shareResource(request, "poll.share", false, params, "question");
                }
            }
        });
    }


}
